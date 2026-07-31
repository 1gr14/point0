/**
 * Sockets end-to-end in a real browser — the reference for testing point0 sockets with Playwright. Two isolated browser
 * contexts (= two users with their own cookies) sign in, open the same chat room, and a message sent from one tab
 * arrives in the other over the WebSocket push — the whole chain: connector auth, space join, serverHandler send, room
 * push, query-cache write.
 *
 * The second test cuts one of them off mid-conversation and pins the CATCH-UP. The channel is `resumable: true` and the
 * message handler buffers (`resumable: true` on the clientHandler), so a short blip PARKS the connection server-side
 * and the resume replays the buffered pushes in order — the missed message arrives through the ring, no connector, no
 * joiner, no refetch. The same `gapless` condition the page keys on covers the longer outage too: past the stream logs
 * (an eviction, a lapsed park, a redeploy) the resume answers `gapless: false` and the history refetch fills the gap
 * instead.
 *
 * Run it from this example's directory: `bun test tests` (needs `bunx playwright install chromium` once, and the
 * example set up — the test runs `bun run setup` itself when the dev database is missing). These tests live in the
 * example on purpose and are NOT part of the repo CI: the repo's planner (`scripts/test.ts`) scans `packages/` and
 * `scripts/` only.
 */
import { afterAll, beforeAll, describe, it, setDefaultTimeout } from 'bun:test'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { chromium, type Browser, type Page, type WebSocketRoute } from 'playwright'

setDefaultTimeout(180_000)

const exampleDir = nodePath.join(import.meta.dir, '..')
const serverPort = 4610
const origin = `http://localhost:${serverPort}`

let serverProcess: Bun.Subprocess | undefined
let browser: Browser | undefined

const waitForServer = async (): Promise<void> => {
  const startedAt = Date.now()
  for (;;) {
    try {
      const response = await fetch(origin)
      if (response.ok) {
        return
      }
    } catch {
      // not up yet
    }
    if (Date.now() - startedAt > 120_000) {
      throw new Error(`The example server did not start on ${origin} in time`)
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

/** Wait for a condition rather than for a duration — the socket is fast, but a loaded machine is not. */
const waitFor = async (predicate: () => boolean, what: string, timeoutMs = 60_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    if (predicate()) {
      return
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
}

const signIn = async (page: Page, nickname: string): Promise<void> => {
  await page.goto(origin)
  await page.getByPlaceholder('nickname').fill(nickname)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Log out' }).waitFor()
}

const openChat = async (page: Page): Promise<void> => {
  await page.goto(`${origin}/chat`)
  // the message input enables once the connection claimed and the room membership joined
  await page.waitForFunction(() => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder^="Message #"]')
    return input !== null && !input.disabled
  })
}

const sendMessage = async (page: Page, text: string): Promise<void> => {
  await page.getByPlaceholder('Message #general').fill(text)
  await page.getByRole('button', { name: 'Send' }).click()
}

describe('socket example in a browser', () => {
  beforeAll(async () => {
    // first run on a fresh checkout: migrate + generate + seed, exactly what a developer runs by hand
    if (!nodeFs.existsSync(nodePath.join(exampleDir, 'dev.db'))) {
      const setup = Bun.spawnSync(['bun', 'run', 'setup'], { cwd: exampleDir, stdout: 'inherit', stderr: 'inherit' })
      if (setup.exitCode !== 0) {
        throw new Error('`bun run setup` failed — see the output above')
      }
    }
    serverProcess = Bun.spawn(['bun', 'run', 'dev'], {
      cwd: exampleDir,
      // the whole port quartet — the .env's 3000/3001 would collide with any other example's dev server running
      // alongside, and the URLs must follow the ports (the client bundle calls CLIENT_URL)
      env: {
        ...process.env,
        SERVER_PORT: String(serverPort),
        CLIENT_PORT: String(serverPort + 1),
        SERVER_URL: `http://localhost:${serverPort}`,
        CLIENT_URL: `http://localhost:${serverPort + 1}`,
      },
      stdout: 'ignore',
      stderr: 'ignore',
    })
    await waitForServer()
    browser = await chromium.launch()
  })

  afterAll(async () => {
    await browser?.close()
    serverProcess?.kill()
    await serverProcess?.exited
  })

  it('a chat message sent in one tab arrives in another over the room push', async () => {
    // two contexts = two users: separate cookie jars, separate WebSocket connections
    const contextAlice = await browser!.newContext()
    const contextBob = await browser!.newContext()
    const alice = await contextAlice.newPage()
    const bob = await contextBob.newPage()
    const runId = crypto.randomUUID().slice(0, 8)

    await signIn(alice, `alice-${runId}`)
    await signIn(bob, `bob-${runId}`)
    await openChat(alice)
    await openChat(bob)

    // Alice sends — her own tab renders it through the query-cache write...
    const fromAlice = `hello from alice ${runId}`
    await sendMessage(alice, fromAlice)
    await alice.getByText(fromAlice).waitFor()
    // ...and Bob receives the ROOM PUSH: no refetch, no reload — the socket delivered it
    await bob.getByText(fromAlice).waitFor()

    // and back, so both directions of the same socket are proven live
    const fromBob = `hi from bob ${runId}`
    await sendMessage(bob, fromBob)
    await alice.getByText(fromBob).waitFor()

    // the nicknames rendered next to the messages come from the httpOnly cookie via the channel's connector
    await bob.getByText(`alice-${runId}`).first().waitFor()

    await contextAlice.close()
    await contextBob.close()
  })

  it('a GUEST watches the room live without signing in — and cannot write', async () => {
    // the guest model is the point of the example: everyone is connected (identity nickname: null), watching is
    // free, and every action is gated server-side — the interface only mirrors it
    const contextAuthor = await browser!.newContext()
    const contextGuest = await browser!.newContext()
    const author = await contextAuthor.newPage()
    const guest = await contextGuest.newPage()
    const runId = crypto.randomUUID().slice(0, 8)

    // the guest opens the chat with NO sign-in: no message input, the guest hint instead
    await guest.goto(`${origin}/chat`)
    await guest.getByText('You are watching as a guest', { exact: false }).waitFor()

    // a signed-in author writes — the guest's tab receives the ROOM PUSH live, no reload, no auth
    await signIn(author, `zoe-${runId}`)
    await openChat(author)
    const fromAuthor = `guests see this ${runId}`
    await sendMessage(author, fromAuthor)
    await guest.getByText(fromAuthor).waitFor()

    await contextAuthor.close()
    await contextGuest.close()
  })

  it('a reload shows the persisted history — the query is the source of truth, not the pushes', async () => {
    // the message arrived over the push and lives in the query cache; a reload starts cold, so what appears is the
    // HISTORY QUERY's answer — the tail of the room (the newest 100), fresh rows included however old the room is
    const context = await browser!.newContext()
    const page = await context.newPage()
    const runId = crypto.randomUUID().slice(0, 8)
    await signIn(page, `eve-${runId}`)
    await openChat(page)
    const text = `survives reload ${runId}`
    await sendMessage(page, text)
    await page.getByText(text).waitFor()

    await page.reload()
    await page.getByText(text).waitFor({ timeout: 30_000 })
    await context.close()
  })

  it('a blip catches up through the resume ring — the push sent while the tab was away arrives on reconnect', async () => {
    const contextCarol = await browser!.newContext()
    const contextDave = await browser!.newContext()
    const carol = await contextCarol.newPage()
    const dave = await contextDave.newPage()
    const runId = crypto.randomUUID().slice(0, 8)

    // Carol's socket, through a tap this test can pull: while `blockSocket` is up every redial is refused, so
    // she is genuinely gone — the page itself cannot tell us that (a membership PARKS through a drop by design, the
    // composer stays enabled), and a test that cannot prove she was away proves nothing about catching up
    let socketRoute: WebSocketRoute | undefined
    let blockSocket = false
    let refusedRedials = 0
    await carol.routeWebSocket(/_point0/, (route) => {
      if (blockSocket) {
        refusedRedials++
        void route.close()
        return
      }
      socketRoute = route
      route.connectToServer()
    })

    await signIn(carol, `carol-${runId}`)
    await signIn(dave, `dave-${runId}`)
    await openChat(carol)
    await openChat(dave)

    const before = `before the drop ${runId}`
    await sendMessage(carol, before)
    await carol.getByText(before).waitFor()
    await dave.getByText(before).waitFor()

    // cut the socket itself, and hold it down: every redial is refused until this flips back. The drop is at the
    // SOCKET, not at the network, on purpose — an offline browser also fires the query client's own reconnect
    // refetch, which would fetch the history for reasons that have nothing to do with the socket and prove nothing
    blockSocket = true
    await socketRoute!.close()
    await waitFor(() => refusedRedials > 0, 'Carol to find her connection gone and start redialing')

    // …and while she is down, Dave says something. Her connection is PARKED (a resumable channel with a buffering
    // handler): publicly she is gone — presence drops her — but the push lands in her replay ring.
    const missed = `missed while down ${runId}`
    await sendMessage(dave, missed)
    await dave.getByText(missed).waitFor()
    if ((await carol.getByText(missed).count()) !== 0) {
      throw new Error(
        'Carol got the message while her socket was down — the drop did not take, the test proves nothing',
      )
    }

    // let her back in: the resume presents { cid, key, cursors } on the fresh socket and the room stream replays the
    // missed push in order — the message appears without a reload and without anyone resending it (`gapless: true`,
    // so the page's catch-up refetch knows it has nothing to do; a gap the ring could not vouch for would answer
    // `gapless: false` and the same `onEnter` condition would refetch the history instead)
    blockSocket = false
    await carol.getByText(missed).waitFor()

    // and the live push is live again: the room delivers to her the ordinary way after the gap
    const after = `after reconnect ${runId}`
    await sendMessage(dave, after)
    await carol.getByText(after).waitFor()

    await contextCarol.close()
    await contextDave.close()
  })
})

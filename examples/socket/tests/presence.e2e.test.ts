/**
 * Presence end-to-end in a real browser. Nobody polls and nobody refetches here: on every join and leave the server
 * computes the room's member list ONCE and pushes the ready list to the room, and each tab writes it straight into its
 * socket-query cache. Two isolated browser contexts (= two users with their own cookies) prove both directions — a
 * watching tab's list GROWS when the second user joins the room, and SHRINKS when their tab goes away, all without that
 * tab doing anything at all.
 *
 * Run it from this example's directory: `bun test tests` (needs `bunx playwright install chromium` once, and the
 * example set up — the test runs `bun run setup` itself when the dev database is missing). These tests live in the
 * example on purpose and are NOT part of the repo CI: the repo's planner (`scripts/test.ts`) scans `packages/` and
 * `scripts/` only.
 */
import { afterAll, beforeAll, describe, it, setDefaultTimeout } from 'bun:test'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { chromium, type Browser, type Page } from 'playwright'

setDefaultTimeout(180_000)

const exampleDir = nodePath.join(import.meta.dir, '..')
// this file's own port quartet — the sibling e2e (chat) holds 4610/4611, and the .env's 3000/3001 would collide with
// any example's dev server running alongside
const serverPort = 4620
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

const signIn = async (page: Page, nickname: string): Promise<void> => {
  await page.goto(origin)
  await page.getByPlaceholder('nickname').fill(nickname)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Log out' }).waitFor()
}

/**
 * Wait until the rendered member list holds exactly these nicknames. The list itself is the witness — the page is asked
 * what it SHOWS, never how it got there, so a push and a refetch would both count (only a push ever happens).
 */
const waitForMembers = async (page: Page, nicknames: string[]): Promise<void> => {
  await page.waitForFunction(
    (expected) => {
      const shown = [...document.querySelectorAll<HTMLElement>('main ul li')].map((item) => item.innerText.trim())
      return shown.length === expected.length && expected.every((nickname) => shown.includes(nickname))
    },
    nicknames,
    { timeout: 120_000 },
  )
}

describe('presence in a browser', () => {
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
      // the whole quartet, not just the ports: the client bundle calls CLIENT_URL, so the URLs must follow them
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

  it("the room's member list grows on a join and shrinks on a leave, pushed to a tab that does nothing", async () => {
    const contextAlice = await browser!.newContext()
    const alice = await contextAlice.newPage()
    const runId = crypto.randomUUID().slice(0, 8)
    const aliceName = `alice-${runId}`
    const bobName = `bob-${runId}`

    await signIn(alice, aliceName)
    await alice.goto(`${origin}/presence`)
    // the first list comes from the socket query — the space's membership enumeration, answered over the connection
    await waitForMembers(alice, [aliceName])

    // a second user opens the SAME room in his own context: his join is what produces the push
    const contextBob = await browser!.newContext()
    const bob = await contextBob.newPage()
    await signIn(bob, bobName)
    await bob.goto(`${origin}/presence`)
    await waitForMembers(bob, [aliceName, bobName])
    // Alice's tab never asked for anything — the join push carried the ready list into her query cache
    await waitForMembers(alice, [aliceName, bobName])

    // and away he goes: the tab closes, the socket dies, the server's leave event recomputes the list and pushes it
    await contextBob.close()
    await waitForMembers(alice, [aliceName])

    await contextAlice.close()
  })
})

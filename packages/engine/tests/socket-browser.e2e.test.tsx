/**
 * Socket in a real browser over the real compiled client bundle in the wave-4 model: the channel authenticates and
 * freezes an identity, rooms come from a space's `join`, handlers bind by a membership (space) or a connection
 * (channel). The compiler strips the server halves (`.connector`, `.joiner`, `.serverReply`), the client runtime opens
 * the one socket, `useConnection` / `useMembership` / `useOnMessageFromServer` drive React.
 *
 * The scenarios: the cold-start GET+Upgrade connect (no ticket POST) with a join + send + room push round-trip, the
 * `useMembership` join lifecycle in the DOM, the suspense socket query (SSR ships the fallback; the browser suspends on
 * the CONNECT stage first, then resolves), the `<Socket>` keeper holding the transport open with zero connections, a
 * STANDALONE space handler in a file nothing imports catching a push (the connect preload chain), a leave that stops
 * room pushes for the leaver only, and a channel-wide broadcast that ignores rooms. The single-tab scenarios run on
 * both bundlers (bun and vite dev) plus bun `--hot`; the two-tab scenarios run on the bun host only — a second
 * concurrent browser tab connects through the vite dev server's WebSocket proxy, which does not carry two simultaneous
 * upgrade sockets, so vite keeps the single-tab parity check.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import { PlaywrightBrowser } from './utils/playwright.js'

setDefaultTimeout(180_000)

const writePoints = async (tp: TestProjectOneClient): Promise<void> => {
  await tp.write(
    'src/socket.points.tsx',
    `import { Suspense, useState } from 'react'
import { z } from 'zod'
import { Socket, useSocket } from '@point0/core/socket'
import { root } from './lib/root.js'

// the channel authenticates and freezes an identity — no room, no data from the connector; \`upgradable\` opts the
// cold-start connect into the GET+Upgrade fast path (default off — the ticket path), which the cold-start test pins.
// A 'slowconn' user connects slowly, so the suspense test can SEE the connect-stage suspension.
export const chatChannel = root.lets('channel', 'chatChannel')
  .input(z.object({ userId: z.string() }))
  .loading(() => <div id="channel-loading">connection_loading</div>)
  .connector(async ({ input }) => {
    if (input.userId.startsWith('slowconn')) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
    return { me: 'user-' + input.userId }
  })
  .channel({ client: { upgradable: true } })

// a space of chat rooms { chatId }; a room whose id starts with 'slow' joins slowly so the 'joining' state is visible
export const chatSpace = chatChannel.lets<{ chatId: string }>('space', 'chatSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(async ({ input }) => {
    if (input.chatId.startsWith('slow')) {
      await new Promise((resolve) => setTimeout(resolve, 1200))
    }
    return { chatId: input.chatId }
  })
  .space()

// a space serverHandler: its reply gets a typed \`room\` (the chatSpace slepok) and pushes to that room (sender included)
export const messageSendHandler = chatSpace.lets('serverHandler', 'messageSendHandler')
  .clientSend(z.object({ text: z.string().min(1) }))
  .serverReply(async ({ input, room }) => {
    void messageReceivedHandler.sendToClient({ text: input.text }, { room })
    return { echo: 'echo_' + input.text }
  })
  .serverHandler()

export const messageReceivedHandler = chatSpace.lets('clientHandler', 'messageReceivedHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// a CHANNEL serverHandler + clientHandler pair — a channel-wide broadcast that ignores rooms (bare sendToClient = all)
export const announceHandler = chatChannel.lets('serverHandler', 'announceHandler')
  .clientSend(z.object({ text: z.string() }))
  .serverReply(async ({ input }) => {
    void announceReceivedHandler.sendToClient({ text: input.text })
    return { ok: true }
  })
  .serverHandler()

export const announceReceivedHandler = chatChannel.lets('clientHandler', 'announceReceivedHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler()

// the room membership + its messages listener — kept in a child so it can unmount (leave) while the messages the parent
// already collected stay on screen. A short membership linger makes the leave frame prompt.
function RoomMember({ room, onMessage }: { room: string; onMessage: (text: string) => void }) {
  const membership = chatSpace.useMembership({ chatId: room }, { linger: 200 })
  messageReceivedHandler(membership).useOnMessageFromServer(({ message }) => {
    onMessage(message.text)
  })
  return (
    <div>
      <div id="mstatus">mstatus_{membership.status}</div>
      <div id="rooms">rooms_{membership.rooms.map((joined) => joined.chatId).join(',') || 'none'}</div>
      <button id="send1" onClick={() => void messageSendHandler(membership).sendToServer({ text: 'one' })}>
        send1
      </button>
      <button id="send2" onClick={() => void messageSendHandler(membership).sendToServer({ text: 'two' })}>
        send2
      </button>
    </div>
  )
}

// under the open channel connection: the channel-wide receiver, the broadcast trigger, and the room membership
function ChatBody({ room }: { room: string }) {
  const [inRoom, setInRoom] = useState(true)
  const [messages, setMessages] = useState<string[]>([])
  const [announced, setAnnounced] = useState<string[]>([])
  // a bare channel clientHandler hook — resolves the ambient channel connection, no room involved
  announceReceivedHandler.useOnMessageFromServer(({ message }) => {
    setAnnounced((prev) => [...prev, message.text])
  })
  return (
    <div>
      <div id="messages">messages_{messages.join('|')}</div>
      <div id="announced">announced_{announced.join('|')}</div>
      <button id="broadcast" onClick={() => void announceHandler.sendToServer({ text: 'all_' + room })}>
        broadcast
      </button>
      <button id="leave" onClick={() => setInRoom(false)}>
        leave
      </button>
      {inRoom ? <RoomMember room={room} onMessage={(text) => setMessages((prev) => [...prev, text])} /> : <div id="mstatus">mstatus_left</div>}
    </div>
  )
}

export const chatPage = root.lets('page', 'chatPage', '/chat')
  .search(z.object({ userId: z.string(), room: z.string() }))
  .page(({ search }) => (
    <chatChannel.Connection input={{ userId: search.userId }}>
      <ChatBody room={search.room} />
    </chatChannel.Connection>
  ))

// a QUERY-flavored serverHandler — the suspense test drives its two suspension stages (connect first, then the fetch)
export const infoHandler = chatChannel.lets('serverHandler', 'infoHandler')
  .clientSend(z.object({ q: z.string() }))
  .serverReply(async ({ input, identity }) => ({ info: 'info_' + input.q + '_' + identity.me }))
  .query()
  .serverHandler()

function SuspenseInfo() {
  // the bare form resolves the ambient <chatChannel.Connection>
  const { data } = infoHandler.useSuspenseSocketQuery({ q: 'x' })
  return <div id="sinfo">{data.info}</div>
}

export const suspensePage = root.lets('page', 'suspensePage', '/suspense')
  .search(z.object({ userId: z.string() }))
  .page(({ search }) => (
    <chatChannel.Connection input={{ userId: search.userId }}>
      <Suspense fallback={<div id="sfall">suspense_waiting</div>}>
        <SuspenseInfo />
      </Suspense>
    </chatChannel.Connection>
  ))

// the socket keeper: <Socket> holds the transport open with ZERO connections; useSocket() reads the vertical live
function KeeperBody() {
  const { status, connections } = useSocket()
  return <div id="sock">sock_{status}_conns_{connections.length}</div>
}

export const keeperPage = root.lets('page', 'keeperPage', '/keeper')
  .page(() => (
    <Socket>
      <KeeperBody />
    </Socket>
  ))
`,
  )
  // a STANDALONE space clientHandler in a file NOTHING on the client imports: the connect's preload chain (channel →
  // its spaces → their handlers, via the manifest tags) must register it before the claim, so a push finds it. Its
  // module-level onMessageFromServer writes straight into the DOM — no React, no imports. The trigger is an HTTP
  // action in the SAME file (the test fetches it directly), so the client import graph never touches this module.
  await tp.write(
    'src/standalone.points.tsx',
    `import { z } from 'zod'
import { root } from './lib/root.js'
import { chatSpace } from './socket.points.js'

export const standaloneReceivedHandler = chatSpace.lets('clientHandler', 'standaloneReceivedHandler')
  .serverSend(z.object({ text: z.string() }))
  .clientHandler({
    client: {
      onMessageFromServer: ({ message }) => {
        const el = document.createElement('div')
        el.id = 'standalone'
        el.textContent = 'standalone_' + message.text
        // into #root — the test's html view reads the app container only (React leaves foreign children alone)
        ;(document.getElementById('root') ?? document.body).appendChild(el)
      },
    },
  })

export const standalonePushAction = root.lets('action', 'standalonePushAction', 'POST', '/standalone-push')
  .body(z.object({ chatId: z.string(), text: z.string() }))
  .loader(({ body }) => {
    void standaloneReceivedHandler.sendToClient({ text: body.text }, { room: { chatId: body.chatId } })
    return new Response('ok')
  })
  .action()
`,
  )
}

const run = (bundler: 'bun' | 'vite' | 'bun-hot', portsRange: [number, number]) => {
  // two concurrent browser tabs both connect through the vite dev server's WebSocket proxy, which does not carry two
  // simultaneous upgrade sockets; the two-tab scenarios run on the bun host only, vite keeps the single-tab parity.
  const multiTab = bundler !== 'vite'

  describe(`socket browser (${bundler})`, () => {
    const tpf = TestProjectOneClientFactory.create({
      namespace: `socket-browser-${bundler}`,
      portsRange,
      superjson: false,
      vite: bundler === 'vite',
    })
    let tp: TestProjectOneClient

    beforeAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
      tpf.setBrowser(await PlaywrightBrowser.init())
      tp = tpf.create()
      await tp.cleanup('ports')
      await tp.init()
      await writePoints(tp)
      tp.spawn(bundler === 'bun-hot' ? ['bun', 'run', 'dev', '--hot'] : ['bun', 'run', 'dev'])
      await tp.waitStarted()
    })

    afterAll(async () => {
      await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    })

    // close each test's tabs so their sockets are cleaned before the next — accumulated pages (each holding a live
    // socket socket) otherwise pile memory onto the headless browser across the suite
    afterEach(async () => {
      const browser = tpf.browser
      if (browser) {
        await Promise.all([...browser.pages].map((page) => page.close().catch(() => {})))
      }
    })

    it('cold start: the first connect is a GET+Upgrade (no ticket POST), then join + send round-trips a room push', async () => {
      // no socket exists yet, so the client opens the WebSocket straight against the channel endpoint (GET+Upgrade) —
      // the handshake IS the connect, no ticket-path POST. The join and the room push then ride that one socket.
      const page = await tp.gotoServer('/chat?userId=cold&room=cold')
      await page.waitContent('mstatus_joined', 30_000)
      await page.waitContent('rooms_cold', 5_000)
      // the cold-start connect never POSTed to the channel endpoint — the upgrade carried the whole connect
      const connectPosts = page.requests.filter(
        (request) => request.method === 'POST' && request.url.includes('/channel/chat-channel'),
      )
      expect(connectPosts).toEqual([])

      // send over the space handler; the reply pushes to the room, which this same socket is subscribed to, so the
      // clientHandler catches its own push — the full serverHandler → room → clientHandler round-trip over the socket
      await page.original.locator('#send1').click()
      await page.waitContent('messages_one', 10_000)
    })

    it('useMembership status transitions joining → joined and exposes the rooms', async () => {
      // the 'slow' room joins slowly, so the membership dwells in 'joining' long enough to observe the transition
      const page = await tp.gotoServer('/chat?userId=trans&room=slow-room')
      await page.waitContent('mstatus_joining', 30_000)
      await page.waitContent('mstatus_joined', 30_000)
      await page.waitContent('rooms_slow-room', 5_000)
    })

    it('suspense socket query: SSR ships the fallback; the browser suspends on the CONNECT first, then resolves', async () => {
      // SSR: a suspense socket query never runs server-side — the render-phase descriptive error is caught by the
      // Suspense boundary and the HTML ships the FALLBACK, never the data
      const html = await tp.fetchServerHtml('/suspense?userId=ssr-check')
      expect(html).toContain('suspense_waiting')
      expect(html).not.toContain('info_x')
      // browser: the slow connector keeps the connection at 'connecting' — the hook suspends on the CONNECT stage
      // (the fallback is visible long before any fetch could run), then the claim lands and the fetch resolves
      const page = await tp.gotoServer('/suspense?userId=slowconn-e2e')
      await page.waitContent('suspense_waiting', 30_000)
      await page.waitContent('info_x_user-slowconn-e2e', 30_000)
    })

    it('<Socket> holds the transport open with zero connections; useSocket() reads the vertical live', async () => {
      // the keeper page opens NO connection — only the <Socket> hold; the socket must still open and stay open,
      // and useSocket() must flip from the SSR 'idle' to the live 'open' with an empty connections list
      const page = await tp.gotoServer('/keeper')
      await page.waitContent('sock_open_conns_0', 30_000)
      // it STAYS open (nothing disposes it while the hold is mounted)
      await new Promise((resolve) => setTimeout(resolve, 700))
      await page.waitContent('sock_open_conns_0', 2_000)
    })

    it.skipIf(!multiTab)(
      'leave: two members both get a room push; the one that unmounts its membership stops, the other keeps getting them',
      async () => {
        const pageA = await tp.gotoServer('/chat?userId=leave-a&room=lounge')
        await pageA.waitContent('mstatus_joined', 30_000)
        const pageB = await tp.gotoServer('/chat?userId=leave-b&room=lounge')
        await pageB.waitContent('mstatus_joined', 30_000)

        // a first push reaches both members
        await pageA.original.locator('#send1').click()
        await pageA.waitContent('messages_one', 10_000)
        await pageB.waitContent('messages_one', 10_000)

        // B leaves the room (unmounts the membership) — the messages it already has stay, but new pushes must not arrive
        await pageB.original.locator('#leave').click()
        await pageB.waitContent('mstatus_left', 10_000)
        // let the membership linger lapse and the leave frame land before pushing again
        await new Promise((resolve) => setTimeout(resolve, 800))

        await pageA.original.locator('#send2').click()
        // A (still in the room) gets the second push; B (left) never does
        await pageA.waitContent('messages_one|two', 10_000)
        await new Promise((resolve) => setTimeout(resolve, 500))
        await pageB.waitContent('!two', 2_000)
        await pageB.waitContent('messages_one', 2_000)
      },
    )

    it('a standalone space handler (a file nothing imports) catches a room push — the connect preloads it', async () => {
      // the standalone clientHandler lives in src/standalone.points.tsx, which NO client code imports — only the
      // connect's preload chain (channel → its spaces → their handlers, via the manifest channel tags) can register
      // it. Its module-level onMessageFromServer writes into the DOM; the push is triggered by fetching the HTTP
      // action in the same file, so the client import graph is provably not involved.
      const page = await tp.gotoServer('/chat?userId=st&room=standalone-room')
      await page.waitContent('mstatus_joined', 30_000)
      const response = await tp.fetchServer('/standalone-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: 'standalone-room', text: 'preloaded' }),
      })
      expect(response.status).toBe(200)
      await page.waitContent('standalone_preloaded', 10_000)
    })

    it.skipIf(!multiTab)('a channel-wide broadcast reaches every connection regardless of room', async () => {
      // two tabs in DIFFERENT rooms — a channel handler's bare sendToClient targets ALL connections, not a room
      const pageA = await tp.gotoServer('/chat?userId=bc-a&room=alpha')
      await pageA.waitContent('mstatus_joined', 30_000)
      const pageB = await tp.gotoServer('/chat?userId=bc-b&room=beta')
      await pageB.waitContent('mstatus_joined', 30_000)

      await pageA.original.locator('#broadcast').click()
      // both tabs receive the broadcast though they sit in different rooms
      await pageA.waitContent('announced_all_alpha', 10_000)
      await pageB.waitContent('announced_all_alpha', 10_000)
    })
  })
}

run('bun', [4350, 4369])
run('vite', [4370, 4384])
run('bun-hot', [4385, 4399])

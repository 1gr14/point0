/**
 * The socket feature's CLIENT STRIP, pinned on real builds.
 *
 * `features.socket` is not a runtime switch — it is a build fact. With it off, the compiler rewrites every
 * `_point0_env.feature.socket` in the CLIENT compile to `false`, the guarded bodies in `@point0/core`'s point0.ts and
 * socket.ts become dead code, and `@point0/core/socket` — the whole client socket runtime and wire protocol — drops out
 * of the browser bundle. The surviving throw is the point: a socket call in such an app still fails loudly.
 *
 * So the assertions come in pairs: the same project, built twice, once with `server: { socket: true }` (the canonical
 * way to turn the feature on) and once without. The socket-only strings must be in one bundle and absent from the
 * other, and the server bundle must keep everything either way — the server is never stripped.
 */
import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'

setDefaultTimeout(180_000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'socket-strip',
  portsRange: [4560, 4599],
  superjson: false,
})

/**
 * Strings that exist ONLY in `@point0/core/socket`'s client half, picked to survive minification (literals, not
 * identifiers): a wire frame type the client parses, a client-side field name of the membership record, the endpoint
 * segment the client dials, and one of the manager's own errors.
 */
const SOCKET_MARKERS = ['claimErr', 'preventRejoin', 'websocket', 'No live connection'] as const

/** What the guard leaves behind when the feature is off — a loud client-side failure, not a silent no-op. */
const FEATURE_OFF_MARKER = 'Socket feature is off'

const pointsFile = `import { root } from './lib/root.js'

export const appChannel = root.lets('channel', 'appChannel').channel()
export const appSpace = appChannel.lets('space', 'appSpace').joiner(() => ({})).space()
`

/** A page that actually USES the socket surface, so nothing is dropped merely for being unreferenced. */
const pageFile = `import { root } from './lib/root.js'
import { appChannel } from './socket.points.js'

export const page = root.lets('page', 'home', '/').page(() => {
  const connection = appChannel.useConnection({})
  return <div id="probe">{connection.status}</div>
})
`

const buildProject = async ({ socket }: { socket: boolean }): Promise<{ client: string; server: string }> => {
  const tp: TestProjectOneClient = tpf.create()
  try {
    await tp.cleanup('ports')
    await tp.init()
    await tp.write('src/socket.points.tsx', pointsFile)
    await tp.write('src/page.tsx', pageFile)
    if (!socket) {
      // the template turns the endpoint on; without it the feature defaults off and the strip is what we measure
      await tp.replace('src/engine.ts', 'socket: true,', '')
    }
    await tp.generate()
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
    return { client: await tp.getDistClientFilesContent(), server: await tp.getDistServerFilesContent() }
  } finally {
    await tp.cleanup({ files: true, ports: true, processes: true })
  }
}

describe('socket feature strip', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  it('with the feature ON the socket runtime is in the client bundle', async () => {
    const { client, server } = await buildProject({ socket: true })
    for (const marker of SOCKET_MARKERS) {
      expect(client).toContain(marker)
    }
    expect(client).not.toContain(FEATURE_OFF_MARKER)
    expect(server).toContain('claimErr')
  })

  it('with the feature OFF the socket runtime is gone from the client bundle, and the throw stays', async () => {
    const { client, server } = await buildProject({ socket: false })
    for (const marker of SOCKET_MARKERS) {
      expect(client).not.toContain(marker)
    }
    // the guards themselves shipped — a socket call in this app fails loudly instead of silently doing nothing
    expect(client).toContain(FEATURE_OFF_MARKER)
    // …and the SERVER keeps every line: a feature is only ever cut from the browser
    expect(server).toContain('claimErr')
  })
})

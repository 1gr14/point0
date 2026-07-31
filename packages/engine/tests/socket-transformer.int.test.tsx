/**
 * `preventTransformer: true` on a channel against a transformer-carrying root, over the REAL wire: the connect rides
 * the HTTP leg (the fetcher's transformer resolution), the send/reply and the push ride the socket frames. The raw
 * channel speaks plain JSON end to end while its sibling keeps the root's envelope — both against one engine, no server
 * listening (the FakeClient in-memory socket).
 */
import { describe, expect, it, setDefaultTimeout } from 'bun:test'
import { z } from 'zod'
import { Point0 } from '@point0/core'
import { waitFor } from '@testing-library/react/pure.js'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/fake-client.js'
import { getFakeBrowserGlobals } from './utils/internal-testing.js'

setDefaultTimeout(120_000)

describe('channel preventTransformer under a transformer-carrying root', () => {
  it('the raw channel speaks plain JSON on the connect leg and the frames; the sibling keeps the root envelope', async () => {
    // an envelope transformer with a loud marker — any asymmetric leg breaks visibly (deserialize(plain).json is gone)
    const envelopeTransformer = {
      serialize: (data: unknown) => ({ json: data, marker: 'envelope' }),
      deserialize: (raw: unknown) => (raw as { json: unknown }).json,
    }
    // every request the connects make, `GET+upgrade`-tagged — the ledger that proves which path a connect took
    const requests: string[] = []
    const root = Point0.lets('root', 'root')
      .transformer(envelopeTransformer)
      .middleware(async ({ request, next }) => {
        const upgrade = request.original.headers.get('upgrade') ? '+upgrade' : ''
        requests.push(`${request.original.method}${upgrade} ${new URL(request.original.url).pathname}`)
        return await next()
      })
      .root()
    const rawChannel = root
      .lets('channel', 'rawChannel')
      .input(z.object({ userId: z.string() }))
      .connector(({ input }) => ({ me: 'user-' + input.userId }))
      .channel({ preventTransformer: true })
    const rawEchoHandler = rawChannel
      .lets('serverHandler', 'rawEchoHandler')
      .clientSend(z.object({ text: z.string() }))
      .serverReply(({ input, identity }) => ({ echoed: input.text, me: identity.me }))
      .serverHandler()
    const richChannel = root
      .lets('channel', 'richChannel')
      .input(z.object({ userId: z.string() }))
      .connector(({ input }) => ({ me: 'user-' + input.userId }))
      .channel()
    const richEchoHandler = richChannel
      .lets('serverHandler', 'richEchoHandler')
      .clientSend(z.object({ text: z.string() }))
      .serverReply(({ input, identity }) => ({ echoed: input.text, me: identity.me }))
      .serverHandler()
    const points = [root, rawChannel, rawEchoHandler, richChannel, richEchoHandler] as const
    const engine = await Engine.create({
      compiler: false,
      file: import.meta.url,
      server: { scope: 'root', points, socket: true },
      clients: [{ scope: 'root', points }],
    }).prepare()
    const fakeClient = FakeClient.create({ engine, scope: 'root', globals: getFakeBrowserGlobals() })
    await fakeClient.run(async () => {
      // the FIRST connect opts into the upgrade handshake (`upgradable` — default is the ticket path) and opens the
      // socket; the rich channel takes that seat so the raw channel's connect below rides the ticket POST — the
      // fetcher's HTTP leg, where the reset used to get lost
      const richConnection = richChannel.connect({ userId: 'u2' }, { upgradable: true })
      await waitFor(() => expect(richConnection.status).toBe('open'), { timeout: 5000 })
      // ONE request — the upgrade GET carried the envelope-serialized input plus `?x-point0-transform=true` (the
      // handshake can carry no custom header, so the transform fact rides the URL) and the server parsed it with the
      // channel's transformer; a ticket fallback would add a POST + a dial
      expect(requests).toEqual(['GET+upgrade /_point0/root/channel/rich-channel'])
      const richReply = await richEchoHandler(richConnection).sendToServer({ text: 'yo' })
      expect(richReply).toEqual({ echoed: 'yo', me: 'user-u2' })
      // the whole raw chain crosses the reset: connect input + identity + ticket (HTTP leg), claim, send/reply frames
      const rawConnection = rawChannel.connect({ userId: 'u1' })
      await waitFor(() => expect(rawConnection.status).toBe('open'), { timeout: 5000 })
      const rawReply = await rawEchoHandler(rawConnection).sendToServer({ text: 'hi' })
      expect(rawReply).toEqual({ echoed: 'hi', me: 'user-u1' })
      rawConnection.disconnect()
      richConnection.disconnect()
    })
    await fakeClient.run(async () => {
      // a fresh page = its own socket, and NO opt-in: the default connect never attempts the upgrade — it takes the
      // TICKET path outright, the connector fetch plus a dial against the bare `/_point0/root/websocket` endpoint,
      // which must match with NO Bun server (the in-memory transport rides the same pipeline a real handshake does)
      const requestsBefore = requests.length
      const connection = rawChannel.connect({ userId: 'u3' })
      await waitFor(() => expect(connection.status).toBe('open'), { timeout: 5000 })
      // no upgrade attempt on the CHANNEL endpoint (the bare `/websocket` dial is a handshake by nature — that one stays)
      expect(requests.slice(requestsBefore).some((line) => line.includes('+upgrade /_point0/root/channel/'))).toBe(
        false,
      )
      expect(requests.slice(requestsBefore).some((line) => line.includes('/_point0/root/websocket'))).toBe(true)
      connection.disconnect()
    })
    await fakeClient.run(async () => {
      // opted in but the input outgrows the upgrade URL cap → the upgrade is skipped and the TICKET path runs: the
      // URL-length fallback survives the opt-in gate
      const requestsBefore = requests.length
      const connection = rawChannel.connect({ userId: 'u4'.padEnd(9000, 'x') }, { upgradable: true })
      await waitFor(() => expect(connection.status).toBe('open'), { timeout: 5000 })
      expect(requests.slice(requestsBefore).some((line) => line.includes('+upgrade /_point0/root/channel/'))).toBe(
        false,
      )
      expect(requests.slice(requestsBefore).some((line) => line.includes('/_point0/root/websocket'))).toBe(true)
      connection.disconnect()
    })
    await fakeClient.run(async () => {
      // the RICH channel over the TICKET path — the everyday connect of a transformer app under the default (no
      // upgrade): the client advertises `x-point0-transform` and envelope-serializes the connect input, the fetcher
      // resolves the channel's SOCKET transformer (= the root's here) for BOTH directions — the input parse (the
      // connector reads `userId` through the envelope) and the `{ id, ticket }` output (the client's rich parse reads
      // it back; an asymmetric leg would leave the connection stuck before `open`)
      const requestsBefore = requests.length
      const connection = richChannel.connect({ userId: 'u5' })
      await waitFor(() => expect(connection.status).toBe('open'), { timeout: 5000 })
      expect(requests.slice(requestsBefore).some((line) => line.includes('+upgrade /_point0/root/channel/'))).toBe(
        false,
      )
      const reply = await richEchoHandler(connection).sendToServer({ text: 'sup' })
      expect(reply).toEqual({ echoed: 'sup', me: 'user-u5' })
      connection.disconnect()
    })
    await fakeClient.destroy()
  })
})

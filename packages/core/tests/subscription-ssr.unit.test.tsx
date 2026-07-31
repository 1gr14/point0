/**
 * The subscription hook under SSR: the render state is a pure function of the options — `connecting` when enabled,
 * `closed` when disabled — computed identically on the server and at hydration, and NO transport ever starts on the
 * server (the stream lives in an effect; opening one during an SSR render would throw `getFetch`'s "server available
 * only inside loaders" error, so a clean render IS the proof). The clientHandler message consumers guard the server
 * themselves: the iterator throws, the listener hook attaches nothing.
 */
import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { z } from 'zod'
import { Point0 } from '../src/point0.js'

const root = Point0.lets('root', 'subSsr').root()

const tickSubscription = root
  .lets('subscription', 'tick')
  .input(z.object({ from: z.number() }))
  .loader(async function* ({ input }) {
    yield { n: input.from }
  })
  .subscription()

const chan = root.lets('channel', 'ssrChan').channel()
const tickerHandler = chan
  .lets('clientHandler', 'ticker')
  .serverSend(z.object({ tick: z.number() }))
  .clientHandler()

describe('subscription hooks under SSR', () => {
  it('useSubscription renders connecting when enabled, closed when disabled — and opens nothing', () => {
    const Probe = ({ enabled }: { enabled: boolean }): React.ReactElement => (
      <i>{tickSubscription.useSubscription({ from: 1 }, { enabled }).status}</i>
    )
    expect(renderToString(<Probe enabled />)).toContain('connecting')
    expect(renderToString(<Probe enabled={false} />)).toContain('closed')
  })

  it('a clientHandler message consumer: the iterator refuses on the server, the listener hook renders inert', () => {
    expect(() => tickerHandler.iterateMessagesFromServer()).toThrow(/client only/)
    const Probe = (): React.ReactElement => {
      tickerHandler.useOnMessageFromServer(() => {})
      return <i>rendered</i>
    }
    // inside an SSR placeholder facade too — the listener attaches nothing on the server, the render stays clean
    const html = renderToString(
      <chan.Connection gate={false}>
        <Probe />
      </chan.Connection>,
    )
    expect(html).toContain('rendered')
  })
})

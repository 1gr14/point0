/**
 * The mountable nature of channels and spaces, server-side rendered (no socket — SSR facades report 'connecting'):
 * `<channel.Connection>` / `<space.Membership>` run the SAME interpreter as any mountable — inherited wrappers apply,
 * `gate` decides which non-ready states show the chain's `.loading()`/`.error()` (default `{ loading: false, error:
 * true }` — progressive render, errors surface; `gate` / `gate={{ loading: true }}` also waits on the connect;
 * `gate={false}` renders through everything) — and a `.with(channel)` injection lands the connection facade in the
 * HOST's `connections` layer, gating with the HOST's own components, never the channel's.
 */
import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { z } from 'zod'
import { Point0 } from '../src/point0.js'

const root = Point0.lets('root', 'rtMount').root()

describe('channels and spaces as mountables (SSR render)', () => {
  it('gate (or gate={{ loading: true }}) gates on the connect with the chain .loading()', () => {
    const chan = root
      .lets('channel', 'gateChan')
      .loading(() => <em>connecting…</em>)
      .channel()
    const html = renderToString(
      <chan.Connection gate>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('connecting…')
    expect(html).not.toContain('kids')
  })

  it('gate={{ loading: true }} merges with the default — loading gates too (errors stay surfaced by default)', () => {
    const chan = root
      .lets('channel', 'objGateChan')
      .loading(() => <em>connecting…</em>)
      .channel()
    const html = renderToString(
      <chan.Connection gate={{ loading: true }}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('connecting…')
    expect(html).not.toContain('kids')
  })

  it('the default gate is progressive — connecting renders the children right away (loading is NOT gated)', () => {
    const chan = root
      .lets('channel', 'defaultGateChan')
      .loading(() => <em>connecting…</em>)
      .channel()
    const html = renderToString(
      <chan.Connection>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('kids')
    expect(html).not.toContain('connecting…')
  })

  it('gate={false} renders the children right away — the connection context still mounts around them', () => {
    const chan = root.lets('channel', 'passChan').channel()
    const html = renderToString(
      <chan.Connection gate={false}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('kids')
  })

  it('a root-chain .with wrapper wraps <channel.Connection> — the channel inherits mount actions like any mountable', () => {
    const wrappedRoot = Point0.lets('root', 'rtMountWrapped')
      .with(({ children }: { children: React.ReactNode }) => <div data-wrap="yes">{children}</div>)
      .root()
    const chan = wrappedRoot.lets('channel', 'wrappedChan').channel()
    const html = renderToString(
      <chan.Connection gate={false}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('data-wrap="yes"')
    expect(html).toContain('kids')
  })

  it('<space.Membership gate> gates on the join with the space chain .loading()', () => {
    const chan = root.lets('channel', 'spaceGateChan').channel()
    const sp = chan
      .lets('space', 'gateSpace')
      .loading(() => <em>joining…</em>)
      .joiner(() => ({}))
      .space()
    const html = renderToString(
      <sp.Membership gate>
        <b>inside</b>
      </sp.Membership>,
    )
    expect(html).toContain('joining…')
    expect(html).not.toContain('inside')
  })

  it('a joiner-less space refuses the membership — the default gate surfaces the typed error at once', () => {
    const chan = root.lets('channel', 'noJoinChan').channel()
    const sp = chan
      .lets<{ userId: string }>('space', 'noJoinSpace')
      .error(({ error }) => <em>refused: {error.message}</em>)
      .space()
    const html = renderToString(
      <sp.Membership>
        <b>inside</b>
      </sp.Membership>,
    )
    expect(html).toContain('takes no client joins')
    expect(html).not.toContain('inside')
  })

  it('.with(channel) lands the facade in the host connections layer — the host renders, socket is progressive', () => {
    const chan = root.lets('channel', 'injectChan').channel()
    const Host = root
      .lets('component', 'withChanHost')
      .with(chan, {})
      .component(({ connections }) => <i>status:{connections[0].status}</i>)
    const html = renderToString(<Host />)
    expect(html).toContain('status:')
    expect(html).toContain('connecting')
  })

  it('.with(channel, input, options, gate) gates with the HOST loading, not the channel one', () => {
    const chan = root
      .lets('channel', 'gatedInjectChan')
      .loading(() => <em>channel-loading</em>)
      .channel()
    const Host = root
      .lets('component', 'withChanGated')
      .loading(() => <em>host-loading</em>)
      .with(chan, {}, undefined, true)
      .component(() => <i>ready</i>)
    const html = renderToString(<Host />)
    expect(html).toContain('host-loading')
    expect(html).not.toContain('channel-loading')
    expect(html).not.toContain('ready')
  })

  it('the LoadingComponent prop overrides the chain .loading() for THIS mount only', () => {
    const chan = root
      .lets('channel', 'overrideChan')
      .loading(() => <em>chain-loading</em>)
      .channel()
    const html = renderToString(
      <chan.Connection gate LoadingComponent={() => <em>prop-loading</em>}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('prop-loading')
    expect(html).not.toContain('chain-loading')
    // without the prop the chain component still renders
    const plain = renderToString(
      <chan.Connection gate>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(plain).toContain('chain-loading')
  })

  it('a channel .sharedInput parses the connect input in the mountable render — the children still render', () => {
    const chan = root
      .lets('channel', 'sharedInputChan')
      .sharedInput(z.object({ chatId: z.string() }))
      .channel()
    const html = renderToString(
      <chan.Connection gate={false} input={{ chatId: 'c1' }}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('kids')
    // a failing parse renders the error component instead — the shared-input promise holds on the client render
    const bad = renderToString(
      <chan.Connection gate={false} input={{ chatId: 1 } as never}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(bad).not.toContain('kids')
  })

  it('scope-declared route-bound actions (.search) are dropped at the channel/space closers — nothing breaks', () => {
    // the TYPE system already rejects opening a channel from a search-carrying scope — the closer-side drop is the
    // runtime belt-and-suspenders for the `any` escape hatch, so the render never hits the route-bound cases
    const searchRoot = (Point0.lets('root', 'rtMountSearch') as any).search(z.object({ q: z.string() })).root()
    const chan = searchRoot.lets('channel', 'searchChan').channel()
    const html = renderToString(
      <chan.Connection gate={false}>
        <span>kids</span>
      </chan.Connection>,
    )
    expect(html).toContain('kids')
    const sp = chan.lets('space', 'searchSpace').space()
    const membershipHtml = renderToString(
      <sp.Membership gate={false}>
        <b>inside</b>
      </sp.Membership>,
    )
    expect(membershipHtml).toContain('inside')
  })

  it('.with(space) lands the facade in the host memberships layer', () => {
    const chan = root.lets('channel', 'injectSpaceChan').channel()
    const sp = chan
      .lets('space', 'injectSpace')
      .joiner(() => ({}))
      .space()
    const Host = root
      .lets('component', 'withSpaceHost')
      .with(sp, {})
      .component(({ memberships }) => <i>status:{memberships[0].status}</i>)
    const html = renderToString(<Host />)
    expect(html).toContain('status:')
    expect(html).toContain('joining')
  })
})

import { describe, expect, it } from 'bun:test'
import { REQUEST0_RENDERS_CACHE_KEY, Request0 } from '../src/request0.js'

const from = (init?: RequestInit) => Request0.create(new Request('https://example.com/x', init)).from

describe('Request0.create — from (request origin)', () => {
  it('collects x-forwarded-for into ips (client-first, trimmed); ip stays null without a Bun server', () => {
    const f = from({ headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18', 'user-agent': 'UA/1.0' } })
    expect(f.ips).toEqual(['203.0.113.7', '70.41.3.18'])
    expect(f.ip).toBeNull() // headers are spoofable, so they never become `ip`
    expect(f.userAgent).toBe('UA/1.0')
  })

  it('collects x-real-ip and cf-connecting-ip into ips, but never into ip', () => {
    expect(from({ headers: { 'x-real-ip': '198.51.100.5' } }).ips).toEqual(['198.51.100.5'])
    expect(from({ headers: { 'x-real-ip': '198.51.100.5' } }).ip).toBeNull()
    expect(from({ headers: { 'cf-connecting-ip': '198.51.100.9' } }).ips).toEqual(['198.51.100.9'])
    expect(from({ headers: { 'cf-connecting-ip': '198.51.100.9' } }).ip).toBeNull()
  })

  it('returns null ip / userAgent when no hints are present', () => {
    const f = from()
    expect(f.ips).toEqual([])
    expect(f.ip).toBeNull()
    expect(f.clientIp).toBeNull()
    expect(f.userAgent).toBeNull()
  })

  it('dedupes repeated IPs across the different headers', () => {
    expect(from({ headers: { 'x-forwarded-for': '5.5.5.5', 'x-real-ip': '5.5.5.5' } }).ips).toEqual(['5.5.5.5'])
  })

  it('puts the socket peer LAST in ips (transport order, client-first); ip stays the peer', () => {
    const request = new Request('https://example.com/x', { headers: { 'x-forwarded-for': '1.1.1.1' } })
    const f = Request0.create(request, { bunServer: { requestIP: () => ({ address: '9.9.9.9' }) } }).from
    expect(f.ips).toEqual(['1.1.1.1', '9.9.9.9'])
    expect(f.ip).toBe('9.9.9.9')
  })

  it('normalizes ips entries: ports, [v6] brackets, IPv4-mapped IPv6, RFC 7239 junk dropped', () => {
    const f = from({
      headers: {
        'x-forwarded-for': '203.0.113.7:5678, [2001:db8::1]:443, ::ffff:198.51.100.5, unknown, _hidden',
      },
    })
    expect(f.ips).toEqual(['203.0.113.7', '2001:db8::1', '198.51.100.5'])
  })

  it('reads the RFC 7239 Forwarded header as the same client-first chain', () => {
    const f = from({
      headers: { forwarded: 'for=203.0.113.7;proto=https, for="[2001:db8::1]:4711", for=100.64.0.3' },
    })
    expect(f.ips).toEqual(['203.0.113.7', '2001:db8::1', '100.64.0.3'])
  })

  it('clientIp: scans the transport chain right-to-left for the first PUBLIC address', () => {
    // client, then the CGNAT/private hops a PaaS edge appends — the rightmost public entry is the visitor
    const f = from({ headers: { 'x-forwarded-for': '203.0.113.7, 100.64.0.3, 10.0.0.1' } })
    expect(f.clientIp).toBe('203.0.113.7')
    // a spoofed prefix the client sent along is stepped over — the edge's own append stays rightmost
    const spoofed = from({ headers: { 'x-forwarded-for': '8.8.8.8, 203.0.113.7, 100.64.0.3' } })
    expect(spoofed.clientIp).toBe('203.0.113.7')
  })

  it('clientIp: a public socket peer (no proxy) is the visitor; a private peer is stepped over', () => {
    const direct = Request0.create(new Request('https://example.com/x'), {
      bunServer: { requestIP: () => ({ address: '203.0.113.50' }) },
    }).from
    expect(direct.clientIp).toBe('203.0.113.50')
    const behindProxy = Request0.create(
      new Request('https://example.com/x', { headers: { 'x-forwarded-for': '203.0.113.7' } }),
      { bunServer: { requestIP: () => ({ address: '100.64.0.9' }) } },
    ).from
    expect(behindProxy.clientIp).toBe('203.0.113.7')
  })

  it('clientIp: a client-sent Forwarded header cannot poison the scan when XFF exists', () => {
    // proxies manage x-forwarded-for and pass a client's `Forwarded` through untouched — the scan must
    // use ONE spelling (XFF wins), or the spoofed entry would sit rightmost, exactly where trust is highest
    const f = from({
      headers: { 'x-forwarded-for': '203.0.113.7, 100.64.0.3', forwarded: 'for=8.8.8.8' },
    })
    expect(f.clientIp).toBe('203.0.113.7')
    // `ips` still merges both spellings — it's the diagnostic list, not the trust decision
    expect(f.ips).toEqual(['203.0.113.7', '100.64.0.3', '8.8.8.8'])
    // with no XFF at all, RFC 7239 is the chain
    expect(from({ headers: { forwarded: 'for=203.0.113.9, for=10.0.0.1' } }).clientIp).toBe('203.0.113.9')
  })

  it('clientIp: falls back to single-value client headers (public only), else null', () => {
    expect(from({ headers: { 'x-real-ip': '198.51.100.5' } }).clientIp).toBe('198.51.100.5')
    expect(from({ headers: { 'x-real-ip': '10.0.0.1' } }).clientIp).toBeNull()
    expect(from({ headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' } }).clientIp).toBeNull()
  })

  it('reads scope from X-Point0-From-Scope and reflects isFromServer (default false)', () => {
    const headers = { 'X-Point0-From-Scope': 'admin' }
    expect(from({ headers }).scope).toBe('admin')
    expect(from({ headers }).server).toBe(false)
    expect(Request0.create(new Request('https://example.com/x', { headers }), { isFromServer: true }).from.server).toBe(
      true,
    )
  })

  it('resolves the referrer location from the referer header', () => {
    expect(from({ headers: { referer: 'https://example.com/docs/intro' } }).location?.pathname).toBe('/docs/intro')
    expect(from().location).toBeNull()
  })

  it('a derived request reports the original client origin from `first`; only `server` is per-hop', () => {
    // first = the real client request: behind a Bun server (real socket IP) with a browser user agent
    const clientReq = new Request('https://example.com/page', { headers: { 'user-agent': 'Browser/1.0' } })
    const first = Request0.create(clientReq, { bunServer: { requestIP: () => ({ address: '9.9.9.9' }) } })
    expect(first.from.ip).toBe('9.9.9.9')
    expect(first.from.server).toBe(false)

    // derived = a server-to-server SSR hop: synthetic original (no UA), the server's own loopback peer — but prev = first
    const serverReq = new Request('https://example.com/_point0/root/query/q1', { method: 'POST' })
    const derived = Request0.create(serverReq, {
      isFromServer: true,
      prev: first,
      bunServer: { requestIP: () => ({ address: '127.0.0.1' }) },
    })
    // origin comes from `first` (the visitor), not the loopback hop
    expect(derived.from.ip).toBe('9.9.9.9')
    expect(derived.from.userAgent).toBe('Browser/1.0')
    // but `server` reflects THIS hop
    expect(derived.from.server).toBe(true)
  })
})

describe('Request0.create — optional options', () => {
  it('works with no options: auto-generates an id and defaults isFromServer to false', () => {
    const request0 = Request0.create(new Request('https://example.com/p'))
    expect(typeof request0.id).toBe('string')
    expect(request0.id.length).toBeGreaterThan(0)
    expect(request0.from.server).toBe(false)
  })
})

describe('Request0.renders', () => {
  it('defaults to 0, mirrors the engine-written cache slot, and has no setter', () => {
    const request0 = Request0.create(new Request('https://example.com/p'))
    expect(request0.renders).toBe(0)
    request0.cache[REQUEST0_RENDERS_CACHE_KEY] = 3
    expect(request0.renders).toBe(3)
    expect(() => {
      ;(request0 as { renders: number }).renders = 9
    }).toThrow()
    expect(request0.renders).toBe(3)
  })

  it('is shared along the request chain — the chain shares one cache', () => {
    const first = Request0.create(new Request('https://example.com/a'))
    first.cache[REQUEST0_RENDERS_CACHE_KEY] = 2
    const next = Request0.create(new Request('https://example.com/b'), { prev: first })
    expect(next.renders).toBe(2)
  })
})

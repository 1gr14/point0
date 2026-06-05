import { describe, expect, it } from 'bun:test'
import { Request0 } from '../src/request0.js'

const from = (init?: RequestInit) => Request0.create(new Request('https://example.com/x', init)).from

describe('Request0.create — from (request origin)', () => {
  it('reads ip from x-forwarded-for (first entry, trimmed) and the user agent', () => {
    const f = from({ headers: { 'x-forwarded-for': '203.0.113.7, 70.41.3.18', 'user-agent': 'UA/1.0' } })
    expect(f.ips).toEqual(['203.0.113.7', '70.41.3.18'])
    expect(f.ip).toBe('203.0.113.7')
    expect(f.userAgent).toBe('UA/1.0')
  })

  it('falls back to x-real-ip then cf-connecting-ip', () => {
    expect(from({ headers: { 'x-real-ip': '198.51.100.5' } }).ip).toBe('198.51.100.5')
    expect(from({ headers: { 'cf-connecting-ip': '198.51.100.9' } }).ip).toBe('198.51.100.9')
  })

  it('returns null ip / userAgent when no hints are present', () => {
    const f = from()
    expect(f.ips).toEqual([])
    expect(f.ip).toBeNull()
    expect(f.userAgent).toBeNull()
  })

  it('dedupes repeated IPs across the different headers', () => {
    expect(from({ headers: { 'x-forwarded-for': '5.5.5.5', 'x-real-ip': '5.5.5.5' } }).ips).toEqual(['5.5.5.5'])
  })

  it('prioritizes Bun requestIP as ips[0], ahead of the forwarded headers', () => {
    const request = new Request('https://example.com/x', { headers: { 'x-forwarded-for': '1.1.1.1' } })
    const f = Request0.create(request, { bunServer: { requestIP: () => ({ address: '9.9.9.9' }) } }).from
    expect(f.ips).toEqual(['9.9.9.9', '1.1.1.1'])
    expect(f.ip).toBe('9.9.9.9')
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
})

describe('Request0.create — optional options', () => {
  it('works with no options: auto-generates an id and defaults isFromServer to false', () => {
    const request0 = Request0.create(new Request('https://example.com/p'))
    expect(typeof request0.id).toBe('string')
    expect(request0.id.length).toBeGreaterThan(0)
    expect(request0.from.server).toBe(false)
  })
})

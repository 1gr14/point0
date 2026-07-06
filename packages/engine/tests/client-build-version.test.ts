import { describe, expect, it } from 'bun:test'
import {
  computeClientBuildVersion,
  computeClientBuildVersionFromOutputs,
  getClientBuildVersionPathSegments,
} from '../src/client-build-version.js'
import { addClientBuildToDocumentHtml } from '../src/render.js'

describe('computeClientBuildVersion', () => {
  it('is deterministic and order/duplicate-insensitive', () => {
    const a = computeClientBuildVersion(['/chunk-a.js', '/chunk-b.js'])
    expect(computeClientBuildVersion(['/chunk-b.js', '/chunk-a.js'])).toBe(a)
    expect(computeClientBuildVersion(['/chunk-a.js', '/chunk-b.js', '/chunk-a.js'])).toBe(a)
    expect(a).toMatch(/^[0-9a-f]{16}$/)
  })

  it('changes when the chunk set changes — the property deploy invalidation rests on', () => {
    const a = computeClientBuildVersion(['/chunk-a.js', '/chunk-b.js'])
    expect(computeClientBuildVersion(['/chunk-a.js', '/chunk-c.js'])).not.toBe(a)
    expect(computeClientBuildVersion(['/chunk-a.js'])).not.toBe(a)
  })
})

describe('computeClientBuildVersionFromOutputs', () => {
  it('identifies the build by its content-hashed files only', () => {
    const outdir = '/proj/dist/client'
    const identity = (outputFiles: string[]) => computeClientBuildVersionFromOutputs({ outputFiles, outdir })
    const base = identity(['/proj/dist/client/chunk-abc.js', '/proj/dist/client/assets/style-def.css'])
    // mutable-by-name artifacts do not shake the version: html documents, sourcemaps, the _point0 metadata files
    expect(
      identity([
        '/proj/dist/client/chunk-abc.js',
        '/proj/dist/client/assets/style-def.css',
        '/proj/dist/client/index.html',
        '/proj/dist/client/chunk-abc.js.map',
        '/proj/dist/client/_point0/root/preload-manifest.json',
        '/proj/dist/client/_point0/root/build-version.json',
      ]),
    ).toBe(base)
    // the compiler's content-addressed asset bytes DO identify the build
    expect(
      identity([
        '/proj/dist/client/chunk-abc.js',
        '/proj/dist/client/assets/style-def.css',
        '/proj/dist/client/_point0/assets/0a1b2c.png',
      ]),
    ).not.toBe(base)
    // and so does any chunk change
    expect(identity(['/proj/dist/client/chunk-xyz.js', '/proj/dist/client/assets/style-def.css'])).not.toBe(base)
  })

  it('version file path segments sit under the scoped _point0 namespace', () => {
    expect(getClientBuildVersionPathSegments('root')).toEqual(['_point0', 'root', 'build-version.json'])
    expect(getClientBuildVersionPathSegments('site')).toEqual(['_point0', 'site', 'build-version.json'])
  })
})

describe('addClientBuildToDocumentHtml', () => {
  const html = '<!doctype html><html><head><title>t</title></head><body><div id="root"></div></body></html>'

  it('injects the version global and the entry reload-once guard', async () => {
    const result = await addClientBuildToDocumentHtml({
      html,
      buildVersion: 'v123',
      entryPublicPath: '/chunk-entry.js',
    })
    expect(result).toContain('window.__POINT0_CLIENT_BUILD_VERSION__ = "v123"')
    expect(result).toContain('id="__POINT0_STALE_ENTRY_GUARD__"')
    expect(result).toContain('"/chunk-entry.js"')
    expect(result).toContain('\'__POINT0_STALE_ENTRY_RELOAD__:\' + "v123"')
  })

  it('skips the guard when the entry chunk is unknown', async () => {
    const result = await addClientBuildToDocumentHtml({ html, buildVersion: 'v123', entryPublicPath: null })
    expect(result).toContain('window.__POINT0_CLIENT_BUILD_VERSION__ = "v123"')
    expect(result).not.toContain('__POINT0_STALE_ENTRY_GUARD__')
  })

  it('is idempotent — a re-injection replaces, not duplicates', async () => {
    const once = await addClientBuildToDocumentHtml({ html, buildVersion: 'v1', entryPublicPath: '/e.js' })
    const twice = await addClientBuildToDocumentHtml({ html: once, buildVersion: 'v2', entryPublicPath: '/e.js' })
    expect(twice.match(/__POINT0_CLIENT_BUILD_VERSION__ = /g)?.length).toBe(1)
    expect(twice).toContain('"v2"')
    expect(twice).not.toContain('"v1"')
  })
})

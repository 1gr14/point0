import { describe, expect, it } from 'bun:test'
import { collectClientBuildHashedFiles, getClientBuildAssetsPathSegments } from '../src/client-build-assets.js'
import { computeClientBuildVersion, computeClientBuildVersionFromOutputs } from '../src/client-build-version.js'

describe('collectClientBuildHashedFiles', () => {
  it('keeps only content-hashed public paths, sorted and deduped — the `asset` variant set', () => {
    const outdir = '/proj/dist/client'
    const files = collectClientBuildHashedFiles({
      outputFiles: [
        '/proj/dist/client/chunk-b.js',
        '/proj/dist/client/chunk-a.js',
        '/proj/dist/client/chunk-a.js',
        '/proj/dist/client/_point0/assets/0a1b2c.png',
        '/proj/dist/client/index.html',
        '/proj/dist/client/chunk-a.js.map',
        '/proj/dist/client/_point0/root/preload-manifest.json',
        '/proj/dist/client/_point0/root/build-version.json',
        '/proj/dist/client/_point0/root/build-assets.json',
      ],
      outdir,
    })
    expect(files).toEqual(['/_point0/assets/0a1b2c.png', '/chunk-a.js', '/chunk-b.js'])
  })

  it('hashes into the same version computeClientBuildVersionFromOutputs produces', () => {
    const outdir = '/proj/dist/client'
    const outputFiles = ['/proj/dist/client/chunk-a.js', '/proj/dist/client/index.html']
    expect(computeClientBuildVersion(collectClientBuildHashedFiles({ outputFiles, outdir }))).toBe(
      computeClientBuildVersionFromOutputs({ outputFiles, outdir }),
    )
  })

  it('assets file path segments sit under the scoped _point0 namespace, beside build-version.json', () => {
    expect(getClientBuildAssetsPathSegments('root')).toEqual(['_point0', 'root', 'build-assets.json'])
    expect(getClientBuildAssetsPathSegments('site')).toEqual(['_point0', 'site', 'build-assets.json'])
  })
})

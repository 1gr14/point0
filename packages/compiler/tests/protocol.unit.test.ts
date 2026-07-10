import { describe, expect, it } from 'bun:test'
import { ASSET_URL_PREFIX } from '../src/assets.js'
import { createVirtualModulePath, parseVirtualModulePath, type VirtualModuleOptions } from '../src/importer.js'
import {
  POINT0_COMPILER_PLUGIN_NAME,
  POINT0_INTERMEDIATE_SOURCE_LABEL_PREFIX,
  POINT0_VIRTUAL_MODULE_NAMESPACE,
  POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX,
  POINT0_VIRTUAL_MODULE_SCHEME,
  virtualModulePathRegex,
} from '../src/protocol.js'

/**
 * The compiler's ids never travel over HTTP, but they DO travel between bundler passes and into emitted source maps, so
 * a value change is still observable — a stale `dist/` or a source map produced by an older compiler carries the old
 * spelling. Pinned literally, like core's wire vocabulary.
 */

const options: VirtualModuleOptions = {
  exportNames: ['a', 'b'],
  importer: '/abs/importer.ts',
  pathOriginal: 'some-pkg',
  pathResolved: '/abs/node_modules/some-pkg/index.js',
  scope: 'root',
  side: 'client',
  deny: 'server only',
  trace: ['/abs/entry.ts'],
}

describe('compiler protocol constants pin their values', () => {
  it('pins the plugin and namespace names both bundlers see', () => {
    expect(POINT0_COMPILER_PLUGIN_NAME).toBe('point0-compiler')
    expect(POINT0_VIRTUAL_MODULE_NAMESPACE).toBe('point0-virtual')
  })

  it('pins the virtual-module id scheme', () => {
    expect(POINT0_VIRTUAL_MODULE_SCHEME).toBe('@point0/virtual')
    expect(POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX).toBe('@point0/virtual?options=')
  })

  it('pins the intermediate source label prefix, including its NUL', () => {
    expect(POINT0_INTERMEDIATE_SOURCE_LABEL_PREFIX).toBe('\0point0-pre-user-babel:')
  })

  it('pins the asset URL prefix — it is baked into every emitted bundle and fetched by the browser', () => {
    // Derived from core's reserved prefix now, so a change there would silently move every asset URL.
    expect(ASSET_URL_PREFIX).toBe('/_point0/assets/')
  })
})

describe('virtualModulePathRegex', () => {
  it('matches an id the compiler built', () => {
    expect(virtualModulePathRegex.test(createVirtualModulePath(options))).toBe(true)
    expect(virtualModulePathRegex.test(`${POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX}%7B%7D`)).toBe(true)
  })

  it('does not match a real specifier, nor an id that is merely suffixed by one', () => {
    expect(virtualModulePathRegex.test('@point0/core')).toBe(false)
    expect(virtualModulePathRegex.test('@point0/virtual')).toBe(false)
    expect(virtualModulePathRegex.test(`./${POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX}`)).toBe(false)
  })
})

describe('virtual module id round-trip', () => {
  it('parses back exactly what it built', () => {
    expect(parseVirtualModulePath(createVirtualModulePath(options))).toEqual(options)
  })
})

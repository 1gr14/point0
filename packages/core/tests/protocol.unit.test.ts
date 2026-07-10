import { describe, expect, it } from 'bun:test'
import * as protocol from '../src/protocol.js'
import {
  getClientBuildVersionRoutePath,
  getPointEndpointRoutePath,
  POINT0_ASSETS_DIR_NAME,
  POINT0_INTERNAL_PATH_PREFIX,
  POINT0_INTERNAL_URL_PREFIX,
} from '../src/protocol.js'

/**
 * These are the strings on the wire, not implementation details. A client compiled against one version of point0 talks
 * to a server compiled against another; a CDN rule, a proxy, an OpenAPI-generated client, and a user's own middleware
 * all key off them. Changing a value here is a breaking change to that contract, so every value is written out
 * literally below rather than derived from the constant — a test that says `expect(X).toBe(X)` would wave any rename
 * through. If one of these fails, the question is not "fix the test" but "did we mean to break someone's deploy".
 */

const HEADERS = {
  POINT0_STREAM_HEADER: 'x-point0-stream',
  POINT0_CLIENT_BUILD_HEADER: 'x-point0-client-build',
  POINT0_FROM_SCOPE_HEADER: 'x-point0-from-scope',
  POINT0_TO_SCOPE_HEADER: 'x-point0-to-scope',
  POINT0_CLIENT_REQUEST_ID_HEADER: 'x-point0-client-request-id',
  POINT0_REQUEST_ID_HEADER: 'x-point0-request-id',
  POINT0_OUTPUT_TYPE_HEADER: 'x-point0-output-type',
  POINT0_TRANSFORM_HEADER: 'x-point0-transform',
  POINT0_NOT_JSON_DATA_HEADER: 'x-point0-not-json-data',
  POINT0_REDIRECT_HEADER: 'x-point0-redirect',
} as const

const GLOBALS = {
  POINT0_ENV_VARS_GLOBAL: '__POINT0_ENV_VARS__',
  POINT0_ENV_CONSTS_GLOBAL: '__POINT0_ENV_CONSTS__',
  POINT0_CLIENT_BUILD_VERSION_GLOBAL: '__POINT0_CLIENT_BUILD_VERSION__',
  POINT0_PUSH_QUERY_GLOBAL: '__POINT0_PUSH_QUERY__',
  POINT0_PUSH_QUERY_BUFFER_GLOBAL: '__POINT0_PUSH_QUERY_BUFFER__',
  POINT0_PUSH_RSC_GLOBAL: '__POINT0_PUSH_RSC__',
  POINT0_PUSH_RSC_BUFFER_GLOBAL: '__POINT0_PUSH_RSC_BUFFER__',
  POINT0_DEHYDRATED_SUPER_STORE_GLOBAL: '__POINT0_DEHYDRATED_SUPER_STORE__',
} as const

const PATHS = {
  POINT0_INTERNAL_PATH_PREFIX: '_point0',
  POINT0_INTERNAL_URL_PREFIX: '/_point0/',
  POINT0_ASSETS_DIR_NAME: 'assets',
  POINT0_BUILD_VERSION_FILE_NAME: 'build-version.json',
  POINT0_BUILD_ASSETS_FILE_NAME: 'build-assets.json',
  POINT0_PRELOAD_MANIFEST_FILE_NAME: 'preload-manifest.json',
} as const

const MISC = {
  POINT0_QUERY_KEY_NAMESPACE: 'point0',
  POINT0_QUERY_GET_INPUT_SEARCH_PARAM: 'input',
} as const

const ALL = { ...HEADERS, ...GLOBALS, ...PATHS, ...MISC }
const exported = protocol as unknown as Record<string, unknown>

describe('protocol constants pin their wire values', () => {
  it.each(Object.entries(ALL))('%s', (name, value) => {
    expect(exported[name]).toBe(value)
  })

  it('pins every string constant the module exports', () => {
    // Catches a constant added to `protocol.ts` without a pinned value — the whole point of that file is that nothing
    // crosses a package boundary unpinned.
    const exportedNames = Object.entries(protocol)
      .filter(([, value]) => typeof value === 'string')
      .map(([name]) => name)
    expect(exportedNames.filter((name) => !(name in ALL))).toEqual([])
  })
})

describe('protocol constants keep their shape', () => {
  it('every header name is lowercase, dash-separated, under the x-point0- prefix', () => {
    for (const header of Object.values(HEADERS)) {
      expect(header).toMatch(/^x-point0-[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('every injected global is a valid JS identifier', () => {
    // The generated scripts do not only assign `window[name]` — they declare `const <name> = …` and hand it over. A
    // name needing bracket access would emit a script that does not parse.
    for (const global of Object.values(GLOBALS)) {
      expect(global).toMatch(/^__POINT0_[A-Z0-9_]*__$/)
    }
  })

  it('no two constants share a value', () => {
    const values = Object.values(ALL)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('protocol path builders', () => {
  it('builds a client build-version route under the reserved prefix', () => {
    expect(getClientBuildVersionRoutePath('root')).toBe('/_point0/root/build-version.json')
    expect(getClientBuildVersionRoutePath('admin')).toBe('/_point0/admin/build-version.json')
  })

  it('builds a point endpoint route under the reserved prefix', () => {
    expect(getPointEndpointRoutePath({ scope: 'root', type: 'query', name: 'get-user' })).toBe(
      '/_point0/root/query/get-user',
    )
    expect(getPointEndpointRoutePath({ scope: 'admin', type: 'infinite-query', name: 'list-posts' })).toBe(
      '/_point0/admin/infinite-query/list-posts',
    )
  })

  it('derives the url prefix and the asset dir from the one reserved segment', () => {
    expect(POINT0_INTERNAL_URL_PREFIX).toBe(`/${POINT0_INTERNAL_PATH_PREFIX}/`)
    expect(`${POINT0_INTERNAL_URL_PREFIX}${POINT0_ASSETS_DIR_NAME}/`).toBe('/_point0/assets/')
  })
})

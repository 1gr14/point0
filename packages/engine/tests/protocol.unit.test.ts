import { describe, expect, it } from 'bun:test'
import * as protocol from '../src/protocol.js'
import { DEHYDRATED_SUPER_STORE_SCRIPT_ID, ENV_CONSTS_SCRIPT_ID, ENV_VARS_SCRIPT_ID } from '../src/render.js'
import { POINT0_ENV_CONSTS_GLOBAL, POINT0_ENV_VARS_GLOBAL } from '@point0/core'

/**
 * The engine-internal half of the vocabulary. These never leave the package, so they are cheaper to change than the
 * core ones — but the dev client and the dev server still have to agree on them, and the script ids are matched against
 * `index.html` files built by an OLDER point0 (a baked env-consts script the render must find and replace, not
 * duplicate). Pinned literally for the same reason as core's.
 */

const HEADERS = {
  POINT0_DISCOVERY_RENDERS_HEADER: 'x-point0-discovery-renders',
  POINT0_MIDDLEWARE_CHECK_FROM_SERVER_HEADER: 'x-point0-middleware-check-from-server',
  POINT0_FORWARDED_FROM_DEV_CLIENT_HEADER: 'x-point0-forwarded-from-dev-client',
} as const

const GLOBALS = {
  POINT0_ENV_EXTEND_FN_GLOBAL: '__POINT0_ENV_EXTEND_FN__',
} as const

const ALL = { ...HEADERS, ...GLOBALS }
const exported = protocol as unknown as Record<string, unknown>

describe('engine protocol constants pin their values', () => {
  it.each(Object.entries(ALL))('%s', (name, value) => {
    expect(exported[name]).toBe(value)
  })

  it('pins every string constant the module exports', () => {
    const exportedNames = Object.entries(protocol)
      .filter(([, value]) => typeof value === 'string')
      .map(([name]) => name)
    expect(exportedNames.filter((name) => !(name in ALL))).toEqual([])
  })

  it('every header name is lowercase, dash-separated, under the x-point0- prefix', () => {
    for (const header of Object.values(HEADERS)) {
      expect(header).toMatch(/^x-point0-[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('the env-extend helper is a valid JS identifier — it is declared inside a generated script', () => {
    expect(GLOBALS.POINT0_ENV_EXTEND_FN_GLOBAL).toMatch(/^__POINT0_[A-Z0-9_]*__$/)
  })
})

describe('engine script ids', () => {
  it('pins the ids a previously built index.html may already carry', () => {
    expect(ENV_CONSTS_SCRIPT_ID).toBe('__POINT0_ENV_CONSTS__')
    expect(ENV_VARS_SCRIPT_ID).toBe('__POINT0_ENV_VARS__')
    expect(DEHYDRATED_SUPER_STORE_SCRIPT_ID).toBe('__POINT0_DEHYDRATED_SUPER_STORE_SCRIPT__')
  })

  it('binds the env script ids to the globals they install, rather than spelling them twice', () => {
    expect(ENV_CONSTS_SCRIPT_ID).toBe(POINT0_ENV_CONSTS_GLOBAL)
    expect(ENV_VARS_SCRIPT_ID).toBe(POINT0_ENV_VARS_GLOBAL)
  })

  it('keeps the super-store script id distinct from the global it installs', () => {
    // Two strings one character apart in meaning and a dozen apart in spelling; the pair is easy to confuse, so the
    // difference is asserted rather than assumed.
    expect(DEHYDRATED_SUPER_STORE_SCRIPT_ID).not.toBe('__POINT0_DEHYDRATED_SUPER_STORE__')
  })
})

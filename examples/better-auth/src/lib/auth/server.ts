import { serverEnv } from '@/lib/env/server'
import { prisma } from '@/lib/prisma'
import { env, getRequest, log } from '@point0/core'
import type { Request0 } from '@point0/core/request0'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

/**
 * Configured better-auth instance for the server.
 *
 * Use `authServer.api.*` for server-side auth operations. For session reads prefer `getMe` — it caches the result per
 * request. Defined via `env.side.define.unsafe.server` so the better-auth/prisma code is pruned from the client
 * bundle.
 *
 * @tags auth, better-auth
 * @related getMe, authClient
 */
export const authServer = env.side.define.unsafe.server(
  betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'sqlite',
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: serverEnv.BETTER_AUTH_SECRET,
    baseURL: serverEnv.BETTER_AUTH_URL,
    logger: {
      log: (level, message, ...args) => {
        log({
          level,
          category: ['better-auth'],
          message: message.replace(/^\[better-auth\] /, ''),
          ...(args.length > 0 ? { meta: { args } } : {}),
        })
      },
    },
  }),
)

// Declare a typed slot on the per-request cache so `getMe` can memoize the session across one SSR request.
declare module '@point0/core/request0' {
  interface RequestCache {
    me?: Me | null
  }
}

export type Me = NonNullable<Awaited<ReturnType<typeof authServer.api.getSession>>>

/**
 * Canonical server-side session read. Cached per request — the first call hits better-auth, the rest reuse the cached
 * value. Returns `null` for anonymous users. On the client use `getMeQuery` instead.
 *
 * @tags auth
 * @related getMeQuery, authServer
 */
export const getMe = async ({ request }: { request?: Request0 } = {}): Promise<Me | null> => {
  request ??= getRequest()
  if (request.cache.me !== undefined) {
    return request.cache.me
  }
  const me = await authServer.api.getSession({ headers: request.original.headers })
  request.cache.me = me
  return me
}

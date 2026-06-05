import { getMeQuery } from '@/lib/auth/api'
import { clientEnv } from '@/lib/env/client'
import { navigate } from '@/lib/navigation'
import { env } from '@point0/core'
import { createAuthClient } from 'better-auth/react'

/**
 * Configured better-auth React client.
 *
 * Use for browser-side auth mutations (sign in, sign up, sign out, update user, …). For reading the current session
 * prefer `getMeQuery` — `authClient` is reserved for mutations so every session read stays cached in one place.
 *
 * @tags auth, client
 * @related getMeQuery, authServer
 */
export const authClient = env.side.define.unsafe.client(
  createAuthClient({
    baseURL: clientEnv.BETTER_AUTH_URL,
    fetchOptions: {
      onRequest: (request) => {
        return request
      },
    },
  }),
)

/**
 * Sign out, drop the cached `me`, and route to the sign-in page. Use this instead of calling `authClient.signOut`
 * directly so the `getMeQuery` cache and navigation stay in sync.
 *
 * @tags auth
 * @related getMeQuery
 */
export const signOutClient = ({
  onError,
  onSettled,
}: { onError?: (error: unknown) => void; onSettled?: () => void } = {}) => {
  void authClient
    .signOut()
    .then((result) => {
      if (result.error) {
        throw result.error
      }
      return getMeQuery.refetchQuery()
    })
    .then(() => {
      void navigate('signIn')
    })
    .catch((error) => {
      onError?.(error)
    })
    .finally(() => {
      onSettled?.()
    })
}

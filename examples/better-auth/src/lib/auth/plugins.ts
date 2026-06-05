import { getMeQuery } from '@/lib/auth/api'
import { getMe } from '@/lib/auth/server'
import { AppError } from '@/lib/error'
import { redirect } from '@/lib/navigation'
import { Point0 } from '@point0/core'

// `ctx` runs on the server, `with` runs on the client. So these gating plugins can be applied to any point
// (page, query, mutation, …) and behave correctly on both sides.

/**
 * Loads `me` into ctx/props from the current session and prefetches `getMeQuery` for the page (so the client has it
 * without a waterfall).
 *
 * Building block for the gating plugins below; rarely used directly. Prefer `authorizedOnlyPlugin`,
 * `redirectUnauthorizedPlugin`, or `redirectAuthorizedPlugin`.
 *
 * @tags auth, plugin
 */
export const mePlugin = Point0.lets('plugin', 'me')
  .onPrefetchPage(async () => {
    await getMeQuery.prefetchQuery()
  })
  .ctx(async ({ request }) => {
    return { me: await getMe({ request }) }
  })
  .with(({ resolve }) => {
    // Returned from `with` (not via `useQuery` directly) so `me` lands only in props, not in the point's `queries`.
    return resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me }))
  })
  .plugin()

/**
 * Gate authorized-only points. Throws `UNAUTHORIZED` for anonymous users; after it, `me` is non-null in ctx and props.
 *
 * @tags auth, plugin
 * @related redirectUnauthorizedPlugin, mePlugin
 */
export const authorizedOnlyPlugin = Point0.lets('plugin', 'authorizedOnly')
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      throw new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    }
    return { me }
  })
  .with(({ props: { me } }) => {
    if (!me) {
      return new AppError('Only for authorized users', { code: 'UNAUTHORIZED' })
    }
    return { me }
  })
  .plugin()

/**
 * Redirects to `home` when the user is already signed in. Use on sign-in / sign-up pages so authenticated users don't
 * land there.
 *
 * @tags auth, plugin
 */
export const redirectAuthorizedPlugin = Point0.lets('plugin', 'redirectAuthorized')
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (me) {
      return redirect('home')
    }
    // return here so the type narrows to `me === null`
    return { me }
  })
  .with(({ props: { me } }) => {
    if (me) {
      return redirect('home')
    }
    return { me }
  })
  .plugin()

/**
 * Redirects to `signIn` for anonymous users. After this plugin, `me` is non-null in ctx and props. Prefer this over
 * `authorizedOnlyPlugin` for pages where redirecting is friendlier than throwing.
 *
 * @tags auth, plugin
 */
export const redirectUnauthorizedPlugin = Point0.lets('plugin', 'redirectUnauthorized')
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      return redirect('signIn')
    }
    // return here so the type narrows to `me !== null`
    return { me }
  })
  .with(({ props: { me } }) => {
    if (!me) {
      return redirect('signIn')
    }
    return { me }
  })
  .plugin()

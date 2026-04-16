import { authClient, authServer } from '@/lib/auth/core'
import { AppError } from '@/lib/error'
import { navigate, redirect } from '@/lib/navigate'
import { root } from '@/lib/root'
import { Point0 } from '@point0/core'

// we can decalre global cache types for request0
declare module '@point0/core/request0' {
  interface RequestCache {
    me: Awaited<ReturnType<typeof authServer.api.getSession>> | undefined
  }
}

// ctx is server only
// with is client only
// so we have helpers that can be applied to page, mutation, query, etc, does not matter

export const mePlugin = Point0.lets('plugin', 'me')
  .ctx(async ({ request }) => {
    if (request.cache.me) {
      // we do not dedupe plugins, but we can do it manually
      // we do not dedupe it on purpose, becouse it may be needed to really trigger twice
      // but not here
      return { me: request.cache.me }
    }
    const me = await authServer.api.getSession({ headers: request.original.headers })
    request.cache.me = me
    // we have request.state for one request
    // and we also have request.cache, which will be applied to all ssr requests during one inital request. Read more in docs
    return { me }
  })
  .with(() => {
    // I can do just return getMeQuery.useQuery(), but then it will come to queries, but I wnat it come only to props
    // so I need to add it here. I think later add helper withQueryAsPorps(useQuery(), (data) => ({me: data}))
    const query = getMeQuery.useQuery()
    if (query.isError) {
      return query.error
    }
    if (query.isLoading || !query.data) {
      return 'loading'
    }
    const me = query.data.me
    return { me }
  })
  .plugin()

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

export const redirectAuthorizedPlugin = Point0.lets('plugin', 'redirectAuthorized')
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (me) {
      return redirect('home')
    }
    // we do return here, to have type me === null
    return { me }
  })
  .with(({ props: { me } }) => {
    if (me) {
      return redirect('home')
    }
    return { me }
  })
  .plugin()

export const redirectUnauthorizedPlugin = Point0.lets('plugin', 'redirectUnauthorized')
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      return redirect('signIn')
    }
    // we do return here, to have type me !== null
    return { me }
  })
  .with(({ props: { me } }) => {
    if (!me) {
      return redirect('signIn')
    }
    return { me }
  })
  .plugin()

export const getMeQuery = root
  .lets('query', 'getMe')
  .loader(async ({ request }) => {
    // I want have my own query, and not use authClient, so It can be cached etc
    return { me: await authServer.api.getSession({ headers: request.original.headers }) }
  })
  .query({
    // I will modify this query manually, so I wnat it never stale
    staleTime: Infinity,
  })

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

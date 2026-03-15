import { ErrorPoint0, Point0 } from '@point0/core'
import { root } from '../root'
import { authServer } from './core'

export const mePlugin = Point0.lets('plugin', 'me')
  .ssr(true)
  .ctx(async ({ request }) => {
    return { me: await authServer.api.getSession({ headers: request.original.headers }) }
  })
  .with(() => {
    const query = getMeQuery.useQuery()
    // if (query.isLoading) {
    //   return 'loading'
    // }
    const me = query.data?.me ?? null
    return { me }
  })
  .plugin()

export const authorizedOnlyPlugin = Point0.lets('plugin', 'authorizedOnly')
  .ssr(true)
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      throw new ErrorPoint0('Only for authorized users')
    }
    return { me }
  })
  .with(({ props: { me } }) => {
    if (!me) {
      return new ErrorPoint0('Only for authorized users')
    }
    return { me }
  })
  .plugin()

export const getMeQuery = root
  .lets('query', 'getMe')
  .loader(async ({ request }) => {
    return { me: await authServer.api.getSession({ headers: request.original.headers }) }
  })
  .query()

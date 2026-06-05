import { getMe } from '@/lib/auth/server'
import { root } from '@/lib/root'

/**
 * The current user on the client — our own cached query instead of reading through `authClient`, so every consumer
 * shares one source of truth. Kept never-stale (`staleTime: Infinity`); after an auth mutation you `refetchQuery` it.
 *
 * @tags auth, query
 * @related getMe
 */
export const getMeQuery = root
  .lets('query', 'getMe')
  .loader(async () => {
    return { me: await getMe() }
  })
  .query({
    // We modify this query by hand after auth mutations, so it should never go stale on its own.
    staleTime: Infinity,
  })

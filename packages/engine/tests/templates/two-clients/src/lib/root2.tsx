import { root } from './root.js'
import superjson from 'superjson'

export const secondRoot = root.lets
  .root()
  // .basepath('/')
  .transformer(superjson)
  .prefetchPageOnNavigate(false)
  .prefetchPageOnLinkHover(false)
  .loading(() => <div>Loading...</div>)
  .error(({ error }) => <div>Error: {error.message}</div>)
  // placeholder
  .root()

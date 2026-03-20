import { root } from './root.js'
import superjson from 'superjson'

export const root2 = root
  .lets('root', 'second')
  // .basepath('/')
  .transformer(superjson)
  .prefetchPageOnNavigate(false)
  .prefetchPageOnLinkHover(false)
  .loading(() => <div>Loading...</div>)
  .error(({ error }) => <div>Error: {error.message}</div>)
  // placeholder
  .root()

import { root } from './root.js'
import superjson from 'superjson'

export const root1 = root
  .lets('root', 'first')
  .ssr(true)
  .baseurl('/')
  .transformer(superjson)
  .prefetchPageOnNavigate(false)
  .prefetchPageOnLinkHover(false)
  .loading(() => <div>Loading...</div>)
  .error(({ error }) => <div>Error: {error.message}</div>)
  // placeholder
  .root()

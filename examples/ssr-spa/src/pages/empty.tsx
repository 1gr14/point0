import { client } from '../lib/client'
import { routes } from '../lib/routes'

export const empty = client
  .lets('page', 'empty')
  .route(routes.empty)
  .loader(({ input }) => {
    return {
      title: 'Empty',
    }
  })
  .page(({ data }) => {
    return <div>Empty</div>
  })

import { client } from '../lib/client'

export const empty = client
  .lets('page', 'empty')
  .route('/empty/:id')
  .loader(({ input }) => {
    return {
      title: 'Empty',
    }
  })
  .page(({ data }) => {
    return <div>Empty</div>
  })

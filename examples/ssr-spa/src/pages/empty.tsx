import { client } from '../lib/client'

export const empty = client
  .lets('page')
  .id('empty')
  .route('/empty')
  .page(() => {
    return <div>Empty</div>
  })

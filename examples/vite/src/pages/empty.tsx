import { client } from '../lib/client'
import { routes } from '../lib/routes'

export const empty = client
  .lets('page', 'empty', routes.empty)
  .loader(({ input }) => {
    return {
      title: 'Empty',
    }
  })
  .clientLoader(({ data }) => {
    return {
      ...data,
      ideasCountX3: 27,
    }
  })
  .page(({ data }) => {
    return (
      <div>
        Empty
        <br />
        Ideas Count X3: {data.ideasCountX3}
      </div>
    )
  })

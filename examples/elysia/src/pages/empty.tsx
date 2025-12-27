import { sharedQuery } from '@/lib/shared'
import { client } from '../lib/client'
import { routes } from '../lib/routes'

export const empty = client
  .lets('page', 'empty', routes.empty)
  // .loader(({ input }) => {
  //   return {
  //     title: 'Empty',
  //   }
  // })
  .clientLoader(({ data }) => {
    return {
      ideasCountX3: 27,
    }
  })
  .page(({ data, query }) => {
    const qr = sharedQuery.useQuery()
    return (
      <div>
        Empty
        <br />
        Ideas Count X3: {data.ideasCountX3}
        <br />
        Shared Query: {qr.data?.shared1}|{qr.data?.shared2}
      </div>
    )
  })

export const sharedEmptyPage = client
  .attach(sharedQuery)
  .lets('page', 'sharedEmpty', routes.sharedEmpty)
  .page(({ data }) => {
    return (
      <div>
        Shared Empty
        <br />
        Shared Data: {data.shared1}|{data.shared2}
      </div>
    )
  })

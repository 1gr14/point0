import { sharedQuery } from '@/lib/shared'
import { client } from '../lib/client'

export const empty = client
  .lets('page', 'empty&x')
  // .route(routes.empty)
  .loader(({ input }) => {
    return {
      title: 'Empty',
      xserver: input.x,
    }
  })
  .clientLoader(({ data, input }) => {
    return {
      ...data,
      xclient: input.x,
      ideasCountX3: 27,
    }
  })
  .page(
    ({ data }) => `${data.ideasCountX3} ideas`,
    ({ data, query }) => {
      const qr = sharedQuery.useQuery()
      return (
        <div>
          Empty
          <br />X server: {data.xserver}
          <br />X client: {data.xclient}
          <br />
          Ideas Count X3: {data.ideasCountX3}
          <br />
          Shared Query: {qr.data?.shared1}|{qr.data?.shared2}
        </div>
      )
    },
  )

export const sharedEmptyPage = client
  .attach(sharedQuery)
  .lets('page', 'sharedEmpty')
  // .route(routes.sharedEmpty)
  .page(({ data }) => {
    return (
      <div>
        Shared Empty
        <br />
        Shared Data: {data.shared1}|{data.shared2}
      </div>
    )
  })

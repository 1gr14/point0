import { Route0 } from '@devp0nt/route0'
import { sharedQuery } from '@/lib/shared'
import { client } from '../lib/client'

// export const emptyQuery = client.lets('action', 'empty').infiniteQuery({}).action()
// export const emptyQuery1 = client.lets('action', 'empty').infiniteQuery().action()
// export const emptyQuery2 = client
//   .lets('action', 'empty')
//   .loader(() => ({}))
//   .infiniteQuery({getNextPageParam: () => 1, initialPageParam: 0, pageParamFromInput: 'x'}).action()
// export const emptyQuery3 = client
//   .lets('action', 'empty')
//   .loader(() => ({}))
//   .infiniteQuery().action()

export const empty = client
  .lets('page', 'empty', 'empty&x')
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
  .head(({ data }) => `${data.ideasCountX3} ideas`)
  .page(({ data }) => {
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
  })

export const sharedEmptyPage = client.lets('page', 'sharedEmpty', Route0.create('/sharedEmpty2')).page(() => {
  return (
    <div>
      Shared Empty
      <br />
      {/* Shared Data: {data.shared1}|{data.shared2} */}
    </div>
  )
})

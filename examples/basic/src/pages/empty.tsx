import { Route0 } from '@devp0nt/route0'
import { sharedQuery } from '@/lib/shared'
import { client } from '../lib/client'

// export const emptyQuery = client.lets('infiniteQuery', 'empty').infiniteQuery({})
// export const emptyQuery1 = client.lets('infiniteQuery', 'empty').infiniteQuery()
// export const emptyQuery2 = client
//   .lets('infiniteQuery', 'empty')
//   .loader(() => ({}))
//   .infiniteQuery({getNextPageParam: () => 1, initialPageParam: 0, pageParamFromInput: 'x'})
// export const emptyQuery3 = client
//   .lets('infiniteQuery', 'empty')
//   .loader(() => ({}))
//   .infiniteQuery()
import Md1 from './md1.mdx'
import Md2, { page } from './md2.mdx'

export const md2Page = client.lets('page', 'md2', '/md2').page((props) => <Md2 {...props} />)

export const empty = client
  .lets('page', 'empty', 'empty/:x')
  .loader(({ params }) => {
    return {
      title: 'Empty',
      xserver: params.x,
    }
  })
  .clientLoader(({ data, params }) => {
    return {
      ...data,
      xclient: params.x,
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
        <br />
        <hr />
        <Md1 x={1} y={2} />
        <Md2 x={3} y={4} />
        {JSON.stringify(page)}
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

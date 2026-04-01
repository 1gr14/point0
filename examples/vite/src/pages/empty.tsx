import { client } from '../lib/client'
import { routes } from '../lib/routes'
// import Md1 from './md1.mdx'
// import Md2, { page } from './md2.mdx'

export const empty = client
  .lets('page', 'empty', routes.empty)
  .loader(() => {
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
        <br />
        {/* <Md1 x={1} y={2} />
        <Md2 x={3} y={4} />
        {JSON.stringify(page)} */}
      </div>
    )
  })

// export const md2Page = client.lets('page', 'md2', '/md2').page((props) => <Md2 {...props} />)

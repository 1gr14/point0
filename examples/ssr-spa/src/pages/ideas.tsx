import { useState } from 'react'
import { generalLayout } from '../layouts/general.js'
import { IdeasView } from './ideas.view.js'

export const ideasPage = generalLayout
  .lets('page', 'ideas')
  .route('/ideas')
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ...data, ideas, ideasCount: ideas.length, env: ctx.env.NODE_ENV }
  })
  .clientLoader(async ({ data }) => {
    return {
      ...data,
      ideasCountX2: data.ideasCount * 2,
    }
  })
  .title(({ data }) => `${data.ideasCountX2} ideas`)
  // if you want to preserve state of "count" on HMR, you need to use this approach,
  // just return ready elemnt imported from another file
  .page(({ data }) => {
    const [count, setCount] = useState(() => 0)
    return (
      <div
        onClick={() => {
          setCount(count + 1)
        }}
      >
        Ideas Count: {data.ideasCount}
        <br />
        Ideas Count X2: {data.ideasCountX2}
        <br />
        {count}: zxc
        <IdeasView data={data} />
      </div>
    )
  })
// you can provider ready element here, but you will loose state on HMR.
// And it is ok for most parts of your app.
// .page(({ data }) => {
//   const [count, setCount] = useState(() => 0)
//   return (
//     <div>
//       <h1>Ideasxxxx</h1>
//       <p>Environment: {data.env}</p>
//       <p
//         onClick={() => {
//           setCount(count + 1)
//         }}
//       >
//         Here are all the amazing ideas shared by our community: {data.ideasCount + count}
//       </p>
//       <div>
//         {data.ideas.map((idea) => (
//           <div key={idea.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
//             <h3>
//               <a href={`/ideas/${idea.id}`}>{idea.title}</a>
//             </h3>
//             <p>{idea.description}</p>
//           </div>
//         ))}
//       </div>
//       <nav>
//         <a href="/">← Back to Home</a>
//       </nav>
//     </div>
//   )
// })

export default ideasPage

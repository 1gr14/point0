import { Link } from 'point0/adapters/wouter/index.js'
import { useState } from 'react'
import { generalLayout } from '../layouts/general.js'
import { routes } from '../lib/routes.js'

export const ideasPage = generalLayout
  .lets('page', 'ideas')
  .route('/ideas&page')
  .infiniteQuery(
    async ({ ctx, data, input }) => {
      const ideasCount = await ctx.prisma.idea.count()
      console.log('input', input)
      const page = Number(input.page ?? 0)
      const limit = 2
      const ideas = await ctx.prisma.idea.findMany({ take: limit, skip: page * limit })
      const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
      return { ...data, ideas, ideasCount, env: ctx.env.NODE_ENV, nextCursor }
    },
    {
      getNextPageParam: (lastPage) => lastPage.ideas[lastPage.ideas.length - 1].id,
      initialPageParam: 0,
    },
  )
  .title(({ data }) => {
    return `${data.ideasCount} ideas`
  })
  // if you want to preserve state of "count" on HMR, you need to use this approach,
  // just return ready elemnt imported from another file
  .page(({ data, query }) => {
    const [count, setCount] = useState(() => 0)
    return (
      <div>
        <h1>Ideas</h1>
        <p>Environment: {data.env}</p>
        <p
          onClick={() => {
            setCount(count + 1)
          }}
        >
          Here are all the amazing ideas shared by our community: {data.ideasCount + count}
        </p>
        <div>
          {query.data.pages
            .flatMap((p) => p.ideas)
            .map((idea) => (
              <div key={idea.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
                <h3>
                  <Link to={routes.idea.get({ id: idea.id })}>{idea.title}</Link>
                </h3>
                <p>{idea.description}</p>
                <p>
                  <Link to={routes.ideaNews.get({ id: idea.id })}>News</Link>
                </p>
              </div>
            ))}
        </div>
        {query.isFetchingNextPage && <div>Loading more...</div>}
        {query.hasNextPage && (
          <button
            disabled={query.isFetchingNextPage}
            onClick={() => {
              query.fetchNextPage().catch(console.error)
            }}
          >
            Load more
          </button>
        )}
        <nav>
          <Link to="/">← Back to Home</Link>
        </nav>
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

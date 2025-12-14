import { useState } from 'react'
import * as z from 'zod'
import { generalLayout } from '../layouts/general.js'
import { Link } from '@/lib/navigate'

export const ideasPage = generalLayout
  .lets('page', 'ideas')
  .input(z.object({ page: z.coerce.number().default(0) }))
  .loader(async ({ ctx, data, input }) => {
    const ideasCount = await ctx.prisma.idea.count()
    const page = input.page
    const limit = 2
    const ideas = await ctx.prisma.idea.findMany({ take: limit, skip: page * limit })
    const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
    // await new Promise((resolve) => setTimeout(resolve, 1000))
    return { ...data, ideas, ideasCount, env: ctx.env.NODE_ENV, nextCursor }
  })
  .clientLoader(async ({ data }) => {
    return { ...data, amazing: '123', ideas: data.ideas.map((idea) => ({ ...idea, amazing: '234' })) }
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: 'page',
  })
  .page(
    (o) => {
      return `${o.data.ideasCount} ideas x`
    },
    ({ data, query }) => {
      const [count, setCount] = useState(() => 0)
      return (
        <div>
          <h1>Ideas</h1>
          <p>Environment: {data.pages[0].env}</p>
          <p
            onClick={() => {
              setCount(count + 1)
            }}
          >
            Here are all the amazing ideas shared by our community: {data.pages[0].ideasCount + count}
            <br />
            Amazing: {data.pages[0].amazing}
          </p>
          <div>
            {query.data.pages
              .flatMap((p) => p.ideas)
              .map((idea) => (
                <div key={idea.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
                  <h3>
                    {/* <Link to={routes.idea.get({ id: idea.id })}>{idea.title}</Link> */}
                    <Link route="idea" input={{ id: idea.id, hash: 'xcv' }}>
                      {idea.title}
                    </Link>
                  </h3>
                  <p>
                    {idea.description}
                    <br />
                    Amazing: {idea.amazing}
                  </p>
                  <p>
                    {/* <Link to={routes.ideaNews.get({ id: idea.id })}>News</Link> */}
                    <Link route="ideaNews" input={{ id: idea.id, hash: 'zxc' }}>
                      News
                    </Link>
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
            {/* <Link to="/">← Back to Home</Link> */}
            <Link route="home">← Back to Home</Link>
          </nav>
        </div>
      )
    },
  )

export default ideasPage

import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const ideaListPage = generalLayout.lets
  .page('/ideas')
  .search(z.object({ page: z.coerce.number().default(0), limit: z.coerce.number().default(2) }))
  .loader(async ({ search: { page, limit } }) => {
    const ideasCount = await prisma.idea.count()
    const ideas = await prisma.idea.findMany({ take: limit, skip: page * limit })
    const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
    return { ideas, ideasCount, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: '?.page',
  })
  .mapper(({ data }) => {
    return {
      ideas: data.pages.flatMap((page) => page.ideas),
      total: data.pages[0].ideasCount,
    }
  })
  .head(({ data: { total } }) => {
    return `${total} ideas`
  })
  .page(({ data: { ideas, total }, queries: [query] }) => {
    return (
      <div>
        <h1>Ideas</h1>
        <p>Here are all the amazing ideas shared by our community: {total}</p>
        <div>
          {ideas.map((idea) => (
            <div key={idea.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
              <h3>
                <Link route="ideaView" input={{ id: idea.id }}>
                  {idea.title}
                </Link>
              </h3>
              <p>
                {idea.description}
                <br />
              </p>
              <p>
                <Link route="ideaNews" input={{ id: idea.id }}>
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
          <Link route="home">← Back to Home</Link>
        </nav>
      </div>
    )
  })

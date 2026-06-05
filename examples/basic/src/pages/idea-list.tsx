import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigation'
import { prisma } from '@/lib/prisma'
import * as z from 'zod'

export const ideaListPage = generalLayout.lets
  .page('/ideas')
  .search(z.object({ page: z.coerce.number().default(0), limit: z.coerce.number().default(2) }))
  .loader(async ({ search: { page, limit } }) => {
    const ideasCount = await prisma.idea.count()
    const ideas = await prisma.idea.findMany({ take: limit, skip: page * limit, orderBy: { updatedAt: 'desc' } })
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
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Ideas</h1>
          <p className="mt-1 text-slate-600">Here are all the amazing ideas shared by our community: {total}</p>
        </div>
        <div className="grid gap-3">
          {ideas.map((idea) => (
            <div key={idea.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                <Link className="text-slate-900 hover:text-blue-600" route="ideaView" input={{ id: idea.id }}>
                  {idea.title}
                </Link>
              </h3>
              <p className="mt-1 text-slate-600">{idea.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link
                  className="inline-flex rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  route="ideaView"
                  input={{ id: idea.id }}
                >
                  Open
                </Link>
                <Link
                  className="inline-flex rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  route="ideaNews"
                  input={{ id: idea.id }}
                >
                  News
                </Link>
              </div>
            </div>
          ))}
        </div>
        {query.hasNextPage && (
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white cursor-pointer hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
            disabled={query.isFetchingNextPage}
            onClick={() => {
              query.fetchNextPage().catch(console.error)
            }}
          >
            {query.isFetchingNextPage ? 'Loading more...' : 'Load more'}
          </button>
        )}
      </div>
    )
  })

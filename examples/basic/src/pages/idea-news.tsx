import { ideaLayout } from '@/layouts/idea'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { useState } from 'react'
import * as z from 'zod'

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring'

export const ideaNewsPostCreateSchema = z.object({
  ideaId: z.number(),
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(2000),
})

export const ideaNewsPostCreateMutation = root.lets
  .mutation()
  .input(ideaNewsPostCreateSchema)
  .loader(async ({ input }) => {
    const newsPost = await prisma.ideaNewsPost.create({
      data: {
        ideaId: input.ideaId,
        title: input.title,
        content: input.content,
      },
    })
    return { newsPost, ideadId: input.ideaId }
  })
  .mutation({
    onSuccess: async ({ ideadId }) => {
      void ideaNewsPage.invalidateInfiniteQuery({ id: ideadId })
    },
  })

export const ideaNewsPage = ideaLayout.lets
  .page('/news')
  .search(z.object({ page: z.coerce.number().default(0), limit: z.coerce.number().default(2) }))
  .loader(async ({ params, search: { page, limit } }) => {
    const ideaId = +params.id
    const newsCount = await prisma.ideaNewsPost.count({ where: { ideaId } })
    const newsPosts = await prisma.ideaNewsPost.findMany({
      where: { ideaId },
      take: limit,
      skip: page * limit,
      orderBy: { createdAt: 'desc' },
    })
    const nextCursor = newsCount > (page + 1) * limit ? page + 1 : undefined
    return { newsPosts, newsCount, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    pageParamFromInput: '?.page',
  })
  .mapper(({ data }) => {
    return {
      newsPosts: data.pages.flatMap((page) => page.newsPosts),
      total: data.pages[0]?.newsCount ?? 0,
    }
  })
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  .head(({ data: { total }, props: { idea } }) => `${total} news for idea "${idea.title}"`)
  .page(({ data: { newsPosts, total }, props: { idea }, queries: [query] }) => {
    return (
      <div className="space-y-5">
        <h3 className="text-2xl font-semibold text-slate-900">News (total: {total})</h3>
        <div className="grid gap-3">
          {newsPosts.map((newsItem) => (
            <div key={newsItem.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h4 className="text-base font-semibold text-slate-900">{newsItem.title}</h4>
              <p className="mt-1 text-slate-600">{newsItem.content}</p>
            </div>
          ))}
        </div>
        {query.isFetchingNextPage && <div className="text-sm text-slate-500">Loading more...</div>}
        {query.hasNextPage && (
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={query.isFetchingNextPage}
            onClick={() => {
              query.fetchNextPage().catch(console.error)
            }}
          >
            Load more
          </button>
        )}
        <CreateIdeNewsPostComponent ideaId={idea.id} />
      </div>
    )
  })

export const CreateIdeNewsPostComponent = ({ ideaId }: { ideaId: number }) => {
  const mutation = ideaNewsPostCreateMutation.useMutation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  return (
    <div className="">
      <hr className="my-4 border-slate-200" />
      <h4 className="text-lg font-semibold text-slate-900">Create News Post</h4>
      <form
        className="mt-4 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void mutation
            .mutateAsync(
              { ideaId, title, content },
              {
                onSuccess: async () => {
                  setTitle('')
                  setContent('')
                },
              },
            )
            .catch((error) => {
              alert(error.message)
            })
        }}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Title</label>
          <input
            className={inputClassName}
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Content</label>
          <input
            className={inputClassName}
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
            }}
          />
        </div>
        <button
          className="inline-flex rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:bg-cyan-300"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  )
}

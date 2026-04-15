import { ideaLayout } from '@/layouts/idea'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { useState } from 'react'
import * as z from 'zod'

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
      <div>
        <h3>News (total: {total})</h3>
        <div>
          {newsPosts.map((newsItem) => (
            <div key={newsItem.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
              <h4>{newsItem.title}</h4>
              <p>{newsItem.content}</p>
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
        <CreateIdeNewsPostComponent ideaId={idea.id} />
      </div>
    )
  })

export const CreateIdeNewsPostComponent = ({ ideaId }: { ideaId: number }) => {
  const mutation = ideaNewsPostCreateMutation.useMutation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  return (
    <div>
      <h4>Create News Post</h4>
      <form
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
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
          }}
        />
        <label>Content</label>
        <input
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
          }}
        />
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Post'}
        </button>
      </form>
    </div>
  )
}

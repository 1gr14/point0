import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigation'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { useState } from 'react'
import * as z from 'zod'

export const ideaListQuery = root.lets
  .query()
  .loader(async () => {
    const ideas = await prisma.idea.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] })
    return { ideas }
  })
  .query()

export const ideaCreateMutation = root.lets
  .mutation()
  .input(z.object({ title: z.string().min(1).max(100) }))
  .loader(async ({ input }) => {
    const idea = await prisma.idea.create({
      data: { title: input.title },
    })
    return { idea }
  })
  .mutation({
    onSuccess: async () => {
      void ideaListQuery.invalidateQuery(true)
    },
  })

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'My App Forever!',
    titleTemplate: null,
  })
  .page(() => {
    const ideasQuery = ideaListQuery.useQuery()
    const mutation = ideaCreateMutation.useMutation()
    const [title, setTitle] = useState('')

    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to My App!</h1>
          <p className="text-slate-600">
            Read about this project{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-600" route="about">
              here
            </Link>
          </p>
        </div>
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-slate-900">Playground</h2>
            <p className="text-sm text-slate-600">
              A tiny full loop to poke at — both points live right in this file: <code>ideaListQuery</code> reads the{' '}
              <code>Idea</code> table, <code>ideaCreateMutation</code> adds a row and refreshes the list.
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void mutation
                .mutateAsync(
                  { title },
                  {
                    onSuccess: async () => {
                      setTitle('')
                    },
                  },
                )
                .catch((error) => {
                  alert(error.message)
                })
            }}
          >
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400"
              placeholder="Your next idea"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
            />
            <button
              className="inline-flex shrink-0 items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Adding...' : 'Add idea'}
            </button>
          </form>
          {ideasQuery.isLoading ? (
            <p className="text-sm text-slate-500">Loading ideas...</p>
          ) : ideasQuery.error ? (
            <p className="text-sm text-slate-500">
              Could not load ideas — run <code>bun run setup</code> to create and seed the database.
            </p>
          ) : ideasQuery.data?.ideas.length ? (
            <ul className="divide-y divide-slate-100">
              {ideasQuery.data.ideas.map((idea) => (
                <li key={idea.id} className="flex items-baseline justify-between gap-3 py-2">
                  <span className="text-sm font-medium text-slate-900">{idea.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{idea.createdAt.toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No ideas yet — add the first one.</p>
          )}
        </div>
      </div>
    )
  })

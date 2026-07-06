import { generalLayout } from '@/layouts/general.js'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// The slow part of the page. `suspend: 'server'` keeps its ~2s loader from blocking the HTML: the
// shell ships immediately with the `.loading()` fallback in place, and this block streams into the
// SAME response when the loader resolves — no client refetch, no flicker.
export const DeferredStatsComponent = root.lets
  .component()
  // fallbacks first: the boundary that catches a suspending query is the closest one declared
  // ABOVE it in the chain — declaring them before the loader/query is the safe habit
  .loading(() => <p className="animate-pulse text-slate-500">Counting ideas (deferred, ~2s)…</p>)
  .error(({ error }) => <p className="text-red-600">Failed to count ideas: {error.message}</p>)
  .loader(async () => {
    await sleep(2000)
    return { ideasCount: await prisma.idea.count() }
  })
  .query({ suspend: 'server' })
  .component(({ data }) => (
    <p className="rounded-lg bg-emerald-50 px-4 py-3 text-emerald-800">
      Ideas in the database: <b>{data.ideasCount}</b> — this block streamed in after the shell.
    </p>
  ))

export default generalLayout
  .lets('page', 'deferDemo', '/defer-demo')
  .head({ title: 'Deferred SSR' })
  .page(() => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Deferred SSR</h1>
          <p className="text-slate-600">
            This heading arrived with the very first bytes of the HTML. The slow block below did not hold it back — its
            query is marked <code>suspend: &apos;server&apos;</code>, so the server started the loader immediately but
            streamed the shell without waiting.
          </p>
        </div>
        <DeferredStatsComponent />
      </div>
    )
  })

import { defer } from '@point0/core'
import { generalLayout } from '@/layouts/general.js'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// A slow SERVER COMPONENT — a plain async function. Its code never ships; only the host elements it
// renders do. `defer()` streams it as a hole: the shell ships now with the fallback below, and this
// markup is pushed into the SAME response ~1.5s later. No query, no island — just deferred server
// markup, the RSC counterpart of the `suspend: 'server'` block above.
const SlowServerBlock = async () => {
  await sleep(1500)
  const ideasCount = await prisma.idea.count()
  return (
    <p className="rounded-lg bg-sky-50 px-4 py-3 text-sky-800">
      Rendered on the server from <b>{ideasCount}</b> ideas — this markup streamed in via <code>defer()</code>.
    </p>
  )
}

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
  .rscDepth(1)
  .loader(async () => ({
    slowBlock: defer(
      <SlowServerBlock />,
      <p className="animate-pulse text-slate-500">Rendering the server block (deferred, ~1.5s)…</p>,
    ),
  }))
  .page(({ data }) => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Deferred SSR</h1>
          <p className="text-slate-600">
            This heading arrived with the very first bytes of the HTML. Neither slow block below held it back — the
            first is a query marked <code>suspend: &apos;server&apos;</code>, the second a server component wrapped in{' '}
            <code>defer()</code>. Both streamed into the same response after the shell.
          </p>
        </div>
        <DeferredStatsComponent />
        {data.slowBlock}
      </div>
    )
  })

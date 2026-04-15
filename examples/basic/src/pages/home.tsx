import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'

export const ideaBestComponent = root.lets
  .component<{ cta: string }>()
  .loader(async () => {
    return {
      // fake best idea
      bestIdea: await prisma.idea.findFirstOrThrow({ orderBy: { id: 'desc' } }),
    }
  })
  .wrapper(({ children }) => {
    return <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  .component(({ data, props }) => {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Best Idea: {data.bestIdea.title}</h2>
        <p className="text-sm text-slate-600">{props.cta}</p>
        <p>
          <Link
            className="font-medium text-indigo-600 hover:text-indigo-700"
            route="ideaView"
            input={{ id: data.bestIdea.id }}
          >
            View Idea Details
          </Link>
        </p>
      </div>
    )
  })

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  .page(() => {
    return (
      <div className="mx-auto max-w-3xl space-y-6 rounded-2xl bg-slate-50 p-6 md:p-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to IdeaNick!</h1>
          <p className="text-slate-600">
            Read about this project{' '}
            <Link className="font-medium text-indigo-600 hover:text-indigo-700" route="about">
              here
            </Link>
          </p>
        </div>
        <p className="rounded-lg bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          Discover fresh ideas and build them faster.
        </p>
        <p>
          <Link
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            route="ideaList"
          >
            Browse ideas
          </Link>
        </p>
        <div>
          <ideaBestComponent.X cta="It is awesome!" />
        </div>
      </div>
    )
  })

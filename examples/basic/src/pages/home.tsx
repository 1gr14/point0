import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { x, y } from '@/lib/x123'

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
  .component(({ data, props }) => {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Best Idea: {data.bestIdea.title}</h2>
        <p className="text-sm text-slate-600">{props.cta}</p>
        <p>
          <Link
            className="font-medium text-blue-700 hover:text-blue-600"
            route="ideaView"
            input={{ id: data.bestIdea.id }}
          >
            View Idea Details
          </Link>
        </p>
      </div>
    )
  })

export const randomMutation = root.lets
  .mutation()
  .loader(async () => {
    return {
      random: 123,
    }
  })
  .mutation()

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => {
    return (
      <div className="mx-auto  space-y-6">
        <div className="space-y-2">
          <h1
            className="text-3xl font-bold tracking-tight text-slate-900"
            onClick={() => randomMutation.fetchMutation().then((res) => console.log(res))}
          >
            Welcome to IdeaNick{x()}!{y}
          </h1>
          <p className="text-slate-600">
            Read about this project{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-600" route="about">
              here
            </Link>
          </p>
        </div>
        <div>
          <ideaBestComponent.X cta="It is awesome!" />
        </div>
      </div>
    )
  })

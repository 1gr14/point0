import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigation'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import gemUrl from '@/assets/gem.png'
import GemIcon from '@/assets/gem.svg?react'

export const IdeaBestComponent = root.lets
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

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <img src={gemUrl} width={40} height={40} alt="gem" />
            <GemIcon width={40} height={40} />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcomex to IdeaNick!</h1>
          </div>
          <p className="text-slate-600">
            Read about this project{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-600" route="about">
              here
            </Link>
          </p>
        </div>
        <div>
          <IdeaBestComponent cta="It is awesome!" />
        </div>
      </div>
    )
  })

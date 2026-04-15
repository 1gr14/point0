import { generalLayout } from '@/layouts/general'
import { ideaViewQuery } from '@/lib/idea'
import { NavLink } from '@/lib/navigate'

export const ideaLayout = generalLayout
  .lets('layout', 'idea', '/ideas/:id')
  .with(ideaViewQuery, ({ params: { id } }) => ({ id: +id }))
  .layout(({ children, data: { idea } }) => {
    return (
      <div className="space-y-5">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{idea.title}</h2>
        <ul className="flex items-center gap-2 pb-2">
          <li>
            <NavLink
              exactClassName="pointer-events-none bg-slate-900 text-white ring-slate-900"
              className="inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              route="ideaView"
              input={{ id: idea.id }}
            >
              Info
            </NavLink>
          </li>
          <li>
            <NavLink
              exactClassName="pointer-events-none bg-slate-900 text-white ring-slate-900"
              className="inline-flex rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              route="ideaNews"
              input={{ id: idea.id }}
            >
              News
            </NavLink>
          </li>
        </ul>
        {children}
      </div>
    )
  })

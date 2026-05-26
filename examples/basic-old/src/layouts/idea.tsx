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
              exactClassName="pointer-events-none bg-transparent! border-slate-200!"
              className="inline-flex rounded-md border border-transparent bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
              route="ideaView"
              input={{ id: idea.id }}
            >
              Info
            </NavLink>
          </li>
          <li>
            <NavLink
              exactClassName="pointer-events-none bg-transparent! border-slate-200!"
              className="inline-flex rounded-md border border-transparent bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
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

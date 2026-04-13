import { generalLayout } from '@/layouts/general'
import { ideaViewQuery } from '@/lib/idea'
import { Link } from '@/lib/navigate'

export const ideaLayout = generalLayout
  .lets('layout', 'idea', '/ideas/:id')
  .with(ideaViewQuery, ({ params: { id } }) => ({ id: +id }))
  .layout(({ children, data: { idea } }) => {
    return (
      <div>
        <h2>Idea: {idea.title}</h2>
        <ul>
          <li>
            <Link route="ideaView" input={{ id: idea.id }}>
              Info
            </Link>
          </li>
          <li>
            <Link route="ideaNews" input={{ id: idea.id }}>
              News
            </Link>
          </li>
        </ul>
        <hr />
        {children}
      </div>
    )
  })

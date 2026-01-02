import { Link } from '@/lib/navigate'
import { routes } from '../lib/routes'
import { generalLayout } from './general'

export const ideaLayout = generalLayout
  .lets('layout', 'idea', '/ideas/:id')
  .loader(async ({ ctx, input: { id }, data }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(id) },
    })
    return { idea }
  })
  .layout(({ children, data: { idea } }) => {
    return (
      <div>
        <h2>Idea: {idea.title}</h2>
        <ul>
          <li>
            <Link to={routes.idea({ id: idea.id })}>Info</Link>
          </li>
          <li>
            <Link to={routes.ideaNews.get({ id: idea.id })}>News</Link>
          </li>
        </ul>
        <hr />
        {children}
      </div>
    )
  })

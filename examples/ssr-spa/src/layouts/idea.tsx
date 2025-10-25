import { client } from '../lib/client'
import { z } from 'zod'
import { Link } from '../lib/router'
import { routes } from '../lib/routes'

export const ideaLayout = client
  .input(
    z.object({
      id: z.coerce.number(),
    }),
  )
  .loader(async ({ ctx, input: { id }, data }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id },
    })
    return { ...data, idea }
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

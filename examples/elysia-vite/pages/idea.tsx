import { ClientPage0 } from '@devp0nt/page0/client'
import type { serverPage0 } from '../server/page0.js'
import { ideaRoute } from '../shared/routes.js'

export const ideaPage = new ClientPage0<typeof serverPage0>()
  .route(ideaRoute)
  .loader(async ({ ctx, location }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(location.params.id) },
    })
    return { idea }
  })
  .component(({ data }) => {
    // const ideasCount = useServerCtx(async (ctx) => {
    //   return await ctx.prisma.idea.count()
    // })
    return (
      <div>
        <h1>{data.idea.title}</h1>
        <p>
          <strong>Description:</strong> {data.idea.description}
        </p>
        <div>
          <h2>Full Content</h2>
          <p>{data.idea.content}</p>
        </div>
        <nav>
          <a href="/ideas">← Back to Ideas</a>
          <a href="/">← Back to Home</a>
        </nav>
      </div>
    )
  })

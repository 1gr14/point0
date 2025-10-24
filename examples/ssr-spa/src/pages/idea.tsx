import type { Ctx } from '../lib/client.js'
import { client } from '../lib/client.js'
import { routes } from '../lib/routes.js'

export const getIdea = async (ctx: Ctx, id: number) => {
  const idea = await ctx.prisma.idea.findUniqueOrThrow({
    where: { id },
  })
  return { idea }
}

export const ideaPage = client
  .route(routes.idea)
  .loader(async ({ ctx, location }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build

    // const idea = await ctx.prisma.idea.findUniqueOrThrow({
    //   where: { id: parseInt(location.params.id) },
    // })
    // return { idea }

    return await getIdea(ctx, parseInt(location.params.id))
  })
  .head(({ data: { idea } }) => ({
    title: idea.title,
  }))
  .page(({ data: { idea } }) => {
    // any hook or whatever here, it is just client code
    return (
      <div>
        <h1>{idea.title}</h1>
        <p>
          <strong>Description:</strong> {idea.description}
        </p>
        <div>
          <h2>Full Content</h2>
          <p>{idea.content}</p>
        </div>
        <nav>
          <a href="/ideas">← Back to Ideas</a>
          <a href="/">← Back to Home</a>
        </nav>
      </div>
    )
  })

export default ideaPage

import { ideaLayout } from '../layouts/idea.js'
import type { Ctx } from '../lib/client.js'
import { Link } from 'point0/adapters/wouter'
import { routes } from '../lib/routes.js'

export const getIdea = async (ctx: Ctx, id: number) => {
  const idea = await ctx.prisma.idea.findUniqueOrThrow({
    where: { id },
  })
  return { idea }
}

// TODO: add getIdeaChain, or getIdeaQuery and use it in layout and for example in updatePage

export const ideaPage = ideaLayout
  .route(routes.idea)
  .loader(async ({ ctx, location }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(location.params.id) },
    })
    return { idea }
  })
  .head(({ data: { idea } }) => ({
    title: idea.title,
  }))
  .page(({ data: { idea } }) => {
    // any hook or whatever here, it is just client code
    return (
      <div>
        <p>
          <b>{idea.description}</b>
        </p>
        <p>{idea.content}</p>
        <nav>
          <Link to="/ideas">← Back to Ideas</Link>
          <Link to="/">← Back to Home</Link>
        </nav>
      </div>
    )
  })

export default ideaPage

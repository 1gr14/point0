import { ideaLayout } from '../layouts/idea.js'
import type { Ctx } from '../lib/client.js'
import { Link } from '../lib/router.js'
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
        <h1>{idea.title}</h1>
        <p>
          <strong>Description:</strong> {idea.description}
        </p>
        <div>
          <h2>Full Content</h2>
          <p>{idea.content}</p>
        </div>
        <nav>
          <Link to="/ideas">← Back to Ideas</Link>
          <Link to="/">← Back to Home</Link>
        </nav>
      </div>
    )
  })

export default ideaPage

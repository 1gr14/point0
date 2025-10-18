import { routes } from '../../src/lib/routes.js'
import { client } from '../../src/lib/client.js'

export default client
  .route(routes.idea)
  .loader(async ({ ctx, location }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(location.params.id) },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => {
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

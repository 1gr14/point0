import { ideaRoute } from '../lib/routes.js'
import { page0 } from '../lib/page0.js'

export default page0
  .route(ideaRoute)
  .loader(async ({ ctx, location }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(location.params.id) },
    })
    return { idea }
  })
  .render(({ data }) => {
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

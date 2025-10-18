import { ClientPoint0 } from '@devp0nt/point0/client'
import type { serverPoint0 } from '../server/point0.js'
import { ideasRoute } from '../shared/routes.js'

export const ideasPage = new ClientPoint0<typeof serverPoint0>()
  .route(ideasRoute)
  .loader(async ({ ctx }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ideas }
  })
  .component(({ data }) => (
    <div>
      <h1>Ideasxx</h1>
      <p>Here are all the amazing ideas shared by our community:</p>
      <div>
        {data.ideas.map((idea) => (
          <div key={idea.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
            <h3>
              <a href={`/ideas/${idea.id}`}>{idea.title}</a>
            </h3>
            <p>{idea.description}</p>
          </div>
        ))}
      </div>
      <nav>
        <a href="/">← Back to Home</a>
      </nav>
    </div>
  ))

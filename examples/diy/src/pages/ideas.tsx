import { useState } from 'react'
import { routes } from '../../src/lib/routes.js'
import { client } from '../lib/client.js'

export default client
  .route(routes.ideas)
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ...data, ideas }
  })
  .page(({ data }) => {
    const [count, setCount] = useState(0)
    return (
      <div>
        <h1>Ideas</h1>
        <p
          onClick={() => {
            setCount(count + 1)
          }}
        >
          Here are all the amazing ideas shared by our community: {data.ideasCount + count}
        </p>
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
    )
  })

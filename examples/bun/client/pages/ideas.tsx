import { ideasRoute } from '../lib/routes.js'
import { page0 } from '../lib/page0.js'
import { useState } from 'react'

export default page0
  .route(ideasRoute)
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ...data, ideas }
  })
  .render(({ data }) => {
    const [count, setCount] = useState(0)
    console.log(123, data.ideasCount)
    return (
      <div>
        <h1>Ideas</h1>
        <p
          onClick={() => {
            console.log(456, count)
            setCount(count + 1)
          }}
        >
          Here are all the amazing ideas shared by our community: {data.ideasCount}
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

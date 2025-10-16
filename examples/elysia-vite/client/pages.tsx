import React from 'react'
import { ClientPage0 } from '@devp0nt/page0/client'
import type { serverPage0 } from '../server/page.js'
import { homeRoute, ideasRoute, ideaRoute } from '../shared/routes.js'
import type { ClientPages0 } from '@devp0nt/page0/client'

// Create client pages
const homePage = new ClientPage0<typeof serverPage0>().route(homeRoute).component(() => (
  <div>
    <h1>Welcome to IdeaNick</h1>
    <p>Discover and share innovative ideas that can change the world!</p>
    <nav>
      <a href="/ideas">Browse Ideas</a>
    </nav>
  </div>
))

const ideasPage = new ClientPage0<typeof serverPage0>()
  .route(ideasRoute)
  .loader(async ({ ctx }: { ctx: any }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ideas }
  })
  .component(({ data }: { data: { ideas: any[] } }) => (
    <div>
      <h1>Ideas</h1>
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

const ideaPage = new ClientPage0<typeof serverPage0>()
  .route(ideaRoute)
  .loader(async ({ ctx, location }: { ctx: any; location: any }) => {
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(location.params.id) },
    })
    return { idea }
  })
  .component(({ data }: { data: { idea: any } }) => (
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
  ))

// Export client pages array
export const clientPages0: ClientPages0 = [
  [homeRoute, homePage],
  [ideasRoute, ideasPage],
  [ideaRoute, ideaPage],
]

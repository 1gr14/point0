import { Link } from 'point0/wouter'
import { useState } from 'react'
import { ideaLayout } from '../layouts/idea.js'
import type { Ctx } from '../lib/client.js'

export const getIdea = async (ctx: Ctx, id: number) => {
  const idea = await ctx.prisma.idea.findUniqueOrThrow({
    where: { id },
  })
  return { idea }
}

// TODO: add getIdeaChain, or getIdeaQuery and use it in layout and for example in updatePage

export const ideaPage = ideaLayout
  .lets('page', 'idea')
  .route()
  .loader(async ({ ctx, input }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(input.id) },
    })
    return { idea }
  })
  .head(({ data: { idea } }) => ({
    title: idea.title,
  }))
  .page(({ data: { idea }, location }) => {
    // any hook or whatever here, it is just client code
    const [state, setState] = useState(() => 0)
    return (
      <div
        onClick={() => {
          setState(state + 1)
        }}
      >
        <p>
          <b>
            {state}: {idea.description}
          </b>
        </p>
        <p>
          <b>location: {JSON.stringify(location)}</b>
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

import { useState } from 'react'
import { Link } from '@/lib/navigate'
import { ideaLayout } from '../layouts/idea.js'
import { ErrorPoint0 } from '@point0/core'

// const getIdea = async (ctx: Ctx, id: number) => {
//   const idea = await ctx.prisma.idea.findUniqueOrThrow({
//     where: { id },
//   })
//   return { idea }
// }

// TODO: add getIdeaChain, or getIdeaQuery and use it in layout and for example in updatePage

export const ideaPage = ideaLayout
  .lets('page', 'idea', '/')
  .loader(async ({ ctx, params }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: +params.id },
    })
    const error = new ErrorPoint0('test error')
    throw error
    return { idea }
  })
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  .head(({ props }) => props.idea.title)
  .page(({ props: { idea }, location }) => {
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

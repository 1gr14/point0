import { Link } from '@/lib/navigate'
import { useState } from 'react'
import { ideaLayout } from '../layouts/idea.js'

// const getIdea = async (ctx: Ctx, id: number) => {
//   const idea = await ctx.prisma.idea.findUniqueOrThrow({
//     where: { id },
//   })
//   return { idea }
// }

export const ideaPage = ideaLayout.lets
  .page('/')
  .loader(async ({ ctx, params }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: +params.id },
    })
    return { idea, j: 1235 }
  })
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  .head(({ props }) => props.idea.title)
  .page(({ props: { idea }, location, data: { j } }) => {
    // any hook or whatever here, it is just client code
    const [state, setState] = useState(() => 0)
    console.error(new Error('ZXZX'))
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
        <p>{j}</p>
        <p>{idea.content}</p>
        <nav>
          <Link to="/ideas">← Back to Ideas</Link>
          <Link to="/">← Back to Home</Link>
        </nav>
      </div>
    )
  })

export default ideaPage

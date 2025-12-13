import { Link0 } from '@/lib/routes.js'
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
  .lets('page', 'idea', '/')
  .loader(async ({ ctx, input }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: parseInt(input.id) },
    })
    return [202, { idea }]
  })
  .clientLoader(async ({ data, location }) => {
    return {
      ...data,
      zxc: 333,
    }
  })
  .page(
    ({ data: { idea } }) => ({
      title: idea.title,
    }),
    ({ data: { idea }, location }) => {
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
              <Link0 to="#zxc">zxc</Link0>-<Link0 to="#zxv">xcv</Link0>
              {state}: {idea.description}
            </b>
          </p>
          <p>
            <b>location: {JSON.stringify(location)}</b>
          </p>
          <p>{idea.content}</p>
          <nav>
            <Link0 route="ideas">← Back to Ideas</Link0>
          </nav>
        </div>
      )
    },
  )

export default ideaPage

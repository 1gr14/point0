import { Link } from '@/lib/navigate'
import { useEffect, useState } from 'react'
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
  .clientLoader(false)
  // .outer(({ children, ErrorComponent, LoadingComponent, input, props, location, inputRaw }) => {
  //   const [loading, setLoading] = useState(true)
  //   useEffect(() => {
  //     setTimeout(() => {
  //       setLoading(false)
  //     }, 1000)
  //   }, [])
  //   if (loading) {
  //     return <LoadingComponent />
  //   }
  //   return children
  // })
  .page(
    ({ data: { idea } }) => ({
      title: idea.title,
    }),
    ({ data: { idea }, location }) => {
      // const x = useNavigate()
      // useEffect(() => {
      //   setTimeout(() => {
      //     x('home')
      //   }, 1000)
      // }, [])
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
              <Link to="#zxc">zxc</Link>-<Link to="#zxv">xcv</Link>
              {state}: {idea.description}
            </b>
          </p>
          <p>
            <b>location: {JSON.stringify(location)}</b>
          </p>
          <p>{idea.content}</p>
          <nav>
            <Link route="ideas">← Back to Ideas</Link>
          </nav>
        </div>
      )
    },
  )

export default ideaPage

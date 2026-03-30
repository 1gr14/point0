import { clientOnlyFn } from '@/lib/client-only.js'
import { Link } from '@/lib/navigate'
import { env } from '@point0/core'
import { useState } from 'react'
import { ideaLayout } from '../layouts/idea.js'

if (env.side.is.client) {
  clientOnlyFn()
}

export const ideaPage = ideaLayout
  .lets('page', 'idea', '/')
  // .clientOnly(({ location }) => <div>ClientOnly {location.pathname}</div>)
  .loader(async ({ ctx, params }) => {
    // it excutes on server, but defined in client file,
    // prisma will never come her on client, becouse of dead code optimization on build
    // if (Math.random()) {
    //   throw new Error('ZXZXZ')
    // }
    const idea = await ctx.prisma.idea.findUniqueOrThrow({
      where: { id: +params.id },
    })

    return [202, { idea }]
  })
  .loader(async ({ data }) => {
    return {
      ...data,
      zxc: 333,
      zxccc: 333,
    }
  })
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
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
  .head(({ props }) => props.idea.title)
  .page(({ props: { idea }, location, data: { zxccc } }) => {
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
          <b>
            locationx: {JSON.stringify(location)} {zxccc}
          </b>
        </p>
        <p>{idea.content}</p>
        <nav>
          <Link route="ideas">← Back to Ideas</Link>
        </nav>
      </div>
    )
  })

export default ideaPage

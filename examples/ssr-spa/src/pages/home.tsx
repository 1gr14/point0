import { Link } from 'point0/adapters/wouter'
import { useEffect, useState } from 'react'
import z from 'zod'
import { generalLayout } from '../layouts/general.js'
import { clientCtx1, clientCtx2 } from '../lib/client-ctx.js'
import { client } from '../lib/client.js'
import { $ } from '../lib/global-store.js'
import { routes } from '../lib/routes.js'

const something = $.define('something', () => {
  return {
    random: Math.random(),
    date: new Date(),
    stable: 123,
    var: 0,
  }
})

export const BestIdeaComponent = client
  .lets('component', 'bestIdea') // TODO: route and id may be right inside lets?
  .input(z.object({ x: z.coerce.number() }))
  .loader(async ({ ctx, input }) => ({
    bestIdea: await ctx.prisma.idea.findUniqueOrThrow({ where: { id: 2 } }),
    y: input.x * 2,
  }))
  .props<{ cta: string }>()
  .component(({ data, props }) => {
    return (
      <div>
        <h1>Best Idea {data.y}</h1>
        <p>{props.cta}</p>
        <p>{data.bestIdea.title}</p>
        <p>
          <Link to={routes.idea({ id: data.bestIdea.id })}>More</Link>
        </p>
      </div>
    )
  })

export default generalLayout
  .lets('page', 'home')
  .route('/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .loader()
  .page(() => {
    const [state, setState] = useState(something.var)
    useEffect(() => {
      something.var = state
    }, [state])
    const ctx1 = clientCtx1.useValue()
    const ctx2 = clientCtx2.useValue()
    const x = clientCtx1.useValue('shmest')
    const y = clientCtx1.useValue(['test', 'shmest'])
    something.stable = 456
    return (
      <div>
        <button
          onClick={() => {
            setState(state + 1)
          }}
        >
          Click me
        </button>
        <p>State: {state}</p>
        <hr />
        <p>Something random: {something.random}</p>
        <p>Something date: {something.date.getTime()}</p>
        <p>Something stable: {something.stable}</p>
        <h1>Welcome to IdeaNick</h1>
        <p>Test: {ctx1.test}</p>
        <p>Test: {ctx2.ideasCountX3}</p>
        <p>X: {x}</p>
        <p>Y.test: {y.test}</p>
        <p>Y.shmest: {y.shmest}</p>
        <p>Discover and share innovative ideas that can change the world!</p>
        <BestIdeaComponent cta="It is awesome!" input={{ x: 10 }} />
        <nav>
          <Link to="/ideas">Browse Ideas</Link>
        </nav>
      </div>
    )
  })

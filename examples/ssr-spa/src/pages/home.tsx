import { generalLayout } from '../layouts/general.js'
import { Link } from 'point0/adapters/wouter'
import { routes } from '../lib/routes.js'
import { clientCtx1, clientCtx2 } from '../lib/client-ctx.js'
import { client } from '../lib/client.js'
import { Route0 } from '@devp0nt/route0'
import z from 'zod'

export const BestIdeaComponent = client
  .lets('component')
  .route(Route0.create('/ideas/best'))
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
  .lets('page')
  .route(routes.home)
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => {
    const ctx1 = clientCtx1.useClientCtx()
    const ctx2 = clientCtx2.useClientCtx()
    return (
      <div>
        <h1>Welcome to IdeaNick</h1>
        <p>Test: {ctx1.test}</p>
        <p>Test: {ctx2.ideasCountX3}</p>
        <p>Discover and share innovative ideas that can change the world!</p>
        <BestIdeaComponent cta="It is awesome!" input={{ x: 10 }} />
        <nav>
          <Link to="/ideas">Browse Ideas</Link>
        </nav>
      </div>
    )
  })

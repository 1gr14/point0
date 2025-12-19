import { Link } from '@/lib/navigate'
import { Point0 } from '@point0/core'
import { useEffect, useState } from 'react'
import * as z from 'zod'
import { generalLayout } from '../layouts/general.js'
import { clientCtx1, clientCtx2 } from '../lib/client-ctx.js'
import { client } from '../lib/client.js'
import { routes } from '../lib/routes.js'
import { ExternalHelperComponent, ExternalHelperComponent2 } from './home.helper.js'
// import icon from '../assets/icon.svg'
import iconUrl from '../assets/icon-1.svg'
import iconRaw from '../assets/icon.svg' with { type: 'text' }
import { Svg } from '../lib/svg.js'
// import { Svg } from '../lib/svg.js'

// const IconText = ``
// const IconUsual = ``

// const something = SuperStore.define('something', () => {
//   return {
//     random: Math.random(),
//     date: new Date(),
//     stable: 123,
//     var: 0,
//   }
// })
const someRandom = Point0.define('someRandom', () => Math.random(), true)
const someDate = Point0.define('someDate', () => new Date(), true)
const someStable = Point0.define('someStable', () => 123, true)
const someVar = Point0.define('someVar', () => 0, true)

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
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => {
    const [state, setState] = useState(someVar.get())
    const [state2, setState2] = useState(0)
    useEffect(() => {
      someVar.set(state)
    }, [state])
    useEffect(() => {
      setTimeout(() => {
        // console.info(clientCtx1.getValue())
      }, 1000)
    }, [])
    const ctx1 = clientCtx1.useValue()
    const ctx2 = clientCtx2.useValue()
    const x = clientCtx1.useValue('shmest')
    const y = clientCtx1.useValue(['test', 'shmest'])
    someStable.set(456)
    return (
      <div>
        <button
          onClick={() => {
            setState(state + 1)
            setState2(state2 + 1)
          }}
        >
          Click me
        </button>
        <p>State: {state}</p>
        <p>State2: {state2}</p>
        <hr />
        <HelperComponent />
        <hr />
        <ExternalHelperComponent />
        <ExternalHelperComponent2.Component />
        <hr />
        <p>Something random: {someRandom.get()}</p>
        <p>Something date: {someDate.get().getTime()}</p>
        <p>Something stable: {someStable.get()}</p>
        <h1>Welcome to IdeaNick</h1>
        <p>Test: {ctx1.test}</p>
        <p>Test: {ctx2.ideasCountX3}</p>
        <p>X: {x}</p>
        <p>Y.test: {y.test}</p>
        <p>Y.shmest: {y.shmest}</p>
        <p>Discover and share innovative ideas that can change the world!</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
          {/* <IconUsual /> */}
          <img
            suppressHydrationWarning
            src={iconUrl}
            alt="Icon"
            style={{ width: '24px', height: '24px', color: '#007bff' }}
          />
          {/* <img src={IconUsual} alt="Icon" style={{ width: '24px', height: '24px', color: '#007bff' }} /> */}
          {/* <div dangerouslySetInnerHTML={{ html: icon }} /> */}
          <Svg src={iconRaw} />
          {/* <span>SVG iconxxxx imported as React component via Vite SVGR plugin</span> */}
        </div>
        <BestIdeaComponent.Component cta="It is awesome!" input={{ x: 10 }} />
        <nav>
          <Link to="/ideas">Browse Ideas</Link>
        </nav>
      </div>
    )
  })

const HelperComponent = () => {
  const [state, setState] = useState(0)
  return (
    <div>
      <p>Helper: {state}</p>
      <button
        onClick={() => {
          setState(state + 1)
        }}
      >
        Click me
      </button>
    </div>
  )
}

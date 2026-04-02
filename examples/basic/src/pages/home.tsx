import { Link } from '@/lib/navigate'
import { superstore } from '@point0/core'
import { useEffect, useState } from 'react'
import * as z from 'zod'
import iconRaw from '../assets/icon.svg' with { type: 'text' }
// import icon from '../assets/icon.svg'
import iconUrl from '../assets/icon-1.svg'
import { generalLayout } from '../layouts/general.js'
import { clientCtx1, clientCtx2 } from '../lib/client-ctx.js'
import { root } from '../lib/client.js'
// import { prisma } from '../lib/prisma.js'
// import { x } from '../lib/client-thing.js'
import { Svg } from '../lib/svg.js'
import { externalHelper2Component, externalHelper3Component, ExternalHelperComponent } from './home.helper.js'

// console.log(prisma.idea.findMany().then((r) => console.log(r.length)))

// console.log(1234, x)
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
const someRandom = superstore.define('someRandom', () => Math.random(), 'clientServerTransferredSsr')
const someDate = superstore.define('someDate', () => new Date(), 'clientServerTransferredSsr')
const someStable = superstore.define('someStable', () => 123, 'clientServerTransferredSsr')
const someVar = superstore.define('someVar', () => 0, 'clientServerTransferredSsr')

export const BestIdeaComponent = root.lets
  .component<{ cta: string }>()
  .input(z.object({ x: z.number() }))
  .input(z.object({ y: z.number() }))
  .loader(async ({ ctx, input }) => {
    return {
      bestIdea: await ctx.prisma.idea.findUniqueOrThrow({ where: { id: 2 } }),
      mult: input.x * input.y * 100,
    }
  })
  .loader(async ({ data }) => ({
    ...data,
    // clDD: ctx.clC,
    slDate: new Date(),
  }))
  .clientLoader(async (o) => {
    await new Promise((resolve) => setTimeout(resolve, 1))
    return {
      ...o.data,
      cllll: new Date(),
    }
  })
  .wrapper(({ children }) => {
    return <div style={{ padding: '10px', border: '1px solid #000' }}>{children}</div>
  })
  .wrapper(({ children }) => {
    return <div style={{ padding: '10px', border: '1px solid #f0f' }}>{children}</div>
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  .wrapper(({ children }) => {
    return children
  })
  // .component(X)
  .component(({ data, props }) => {
    return (
      <div>
        <h1>Best Idea {data.mult}</h1>
        <p>CTA: {props.cta}</p>
        <p>TITLE: {data.bestIdea.title}</p>
        <p>SLDATE: {typeof data.slDate}</p>
        {/* <p>CLLLL: {typeof data.cllll}</p> */}
        <p>
          <Link route="idea" input={{ id: data.bestIdea.id }}>
            More
          </Link>
        </p>
      </div>
    )
  })

// function X({ data, props, location }) {
//   return (
//     <div>
//       <h1>Best Idea {data.mult}</h1>
//       <p>CTA: {props.cta}</p>
//       <p>TITLE: {data.bestIdea.title}</p>
//       {/* <p>CLD: {data.clD}</p> */}
//       {/* <p>CLDD: {data.clDD}</p> */}
//       <p>SLDATE: {typeof data.slDate}</p>
//       {/* <p>CLLLL: {typeof data.cllll}</p> */}
//       <p>
//         <Link to={routes.idea({ id: data.bestIdea.id })}>More</Link>
//       </p>
//     </div>
//   )
// }

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  // .loader()
  // .page(function X({ location }) {
  // .page(Z)
  .page(() => {
    const [state, setState] = useState(someVar.get())
    const [state2, setState2] = useState(0)
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
            // BestIdeaComponent.fetchQuery({ x: 10, y: 20 })
            //   .then((result) => {
            //     console.info(result)
            //   })
            //   .catch((error: unknown) => {
            //     console.error(error)
            //   })
            // clientFnMutation
            //   .executeDetailed()
            //   .then((result) => {
            //     console.info(1, result)
            //   })
            //   .catch((error: unknown) => {
            //     console.error(error)
            //   })
          }}
        >
          Click mex
        </button>
        <p>State: {state}</p>
        <p>State2: {state2}</p>
        <hr />
        <HelperComponent />
        <hr />
        <ExternalHelperComponent />
        <externalHelper2Component.Component />
        <externalHelper3Component.X />
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
          <Svg src={iconRaw} width={24} height={24} />
          {/* <span>SVG iconxxxx imported as React component via Vite SVGR plugin</span> */}
        </div>
        <BestIdeaComponent.Component cta="It is awesome!" input={{ x: 10, y: 20 }} />
        <nav>
          <Link to="/ideas">Browse Ideas</Link>
        </nav>
      </div>
    )
  })

// function Z({ location }) {
//   const [state, setState] = useState(someVar.get())
//   const [state2, setState2] = useState(0)
//   useEffect(() => {
//     setTimeout(() => {
//       // console.info(clientCtx1.getValue())
//     }, 1000)
//   }, [])
//   const ctx1 = clientCtx1.useValue()
//   const ctx2 = clientCtx2.useValue()
//   const x = clientCtx1.useValue('shmest')
//   const y = clientCtx1.useValue(['test', 'shmest'])
//   someStable.set(456)
//   return (
//     <div>
//       <button
//         onClick={() => {
//           setState(state + 1)
//           setState2(state2 + 1)
//           BestIdeaComponent.executeDetailed({ x: 10, y: 20 })
//             .then((result) => {
//               console.info(result)
//             })
//             .catch((error: unknown) => {
//               console.error(error)
//             })
//           clientFnMutation
//             .executeDetailed()
//             .then((result) => {
//               console.info(1, result)
//             })
//             .catch((error: unknown) => {
//               console.error(error)
//             })
//         }}
//       >
//         Click me
//       </button>
//       <p>State: {state}</p>
//       <p>State2: {state2}</p>
//       <hr />
//       <HelperComponent />
//       <hr />
//       <ExternalHelperComponent />
//       <ExternalHelperComponent2.Component />
//       <ExternalHelperComponent3.X />
//       <hr />
//       <p>Something random: {someRandom.get()}</p>
//       <p>Something date: {someDate.get().getTime()}</p>
//       <p>Something stable: {someStable.get()}</p>
//       <h1>Welcome to IdeaNick</h1>
//       <p>Test: {ctx1.test}</p>
//       <p>Test: {ctx2.ideasCountX3}</p>
//       <p>X: {x}</p>
//       <p>Y.test: {y.test}</p>
//       <p>Y.shmest: {y.shmest}</p>
//       <p>Discover and share innovative ideas that can change the world!</p>
//       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0' }}>
//         {/* <IconUsual /> */}
//         <img
//           suppressHydrationWarning
//           src={iconUrl}
//           alt="Icon"
//           style={{ width: '24px', height: '24px', color: '#007bff' }}
//         />
//         {/* <img src={IconUsual} alt="Icon" style={{ width: '24px', height: '24px', color: '#007bff' }} /> */}
//         {/* <div dangerouslySetInnerHTML={{ html: icon }} /> */}
//         <Svg src={iconRaw} width={24} height={24} />
//         {/* <span>SVG iconxxxx imported as React component via Vite SVGR plugin</span> */}
//       </div>
//       <BestIdeaComponent.Component cta="It is awesome!" input={{ x: 10, y: 20 }} />
//       <nav>
//         <Link to="/ideas">Browse Ideas</Link>
//       </nav>
//     </div>
//   )
// }

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

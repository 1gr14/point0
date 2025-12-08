import { useState } from 'react'
import { client } from '../lib/client.js'

export const ExternalHelperComponent = () => {
  const [state, setState] = useState(0)
  return (
    <div>
      <p>External Helper: {state}</p>
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

export const ExternalHelperComponent2 = client.componentx({
  name: 'externalHelper2',
  loader: async (o) => ({
    zxc: 0,
    z: o.ctx.z,
  }),
  ctx: (o) => ({
    z: 123,
    ...o.ctx,
  }),
  component: ({ data }) => {
    const [state, setState] = useState(0)
    return (
      <div>
        <p>External Helper 2: {state}</p>
        <button
          onClick={() => {
            setState(state + 1)
          }}
        >
          Click me
        </button>
      </div>
    )
  },
})

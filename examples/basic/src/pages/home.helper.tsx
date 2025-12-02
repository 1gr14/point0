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

export const ExternalHelperComponent2 = client.lets('component', 'externalHelper2').component(() => {
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
})

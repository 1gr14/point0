import { useState } from 'react'

export const ExternalHelperComponent = () => {
  const [state, setState] = useState(0)
  return (
    <div>
      <p>External Helper: {state}</p>
      <button
        onClick={() => {
          setState(state + 1)
          throw new Error('test')
        }}
      >
        Click me
      </button>
    </div>
  )
}

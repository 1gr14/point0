import { useState } from 'react'

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

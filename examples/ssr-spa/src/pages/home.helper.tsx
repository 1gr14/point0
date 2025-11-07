import { useState } from 'react'

export const HomeHelper = (props: { initialState: number }) => {
  const [state, setState] = useState(0)
  return (
    <div>
      <button
        onClick={() => {
          setState(state + 1)
        }}
      >
        Click me
      </button>
      <p>Good State: {state}</p>
    </div>
  )
}

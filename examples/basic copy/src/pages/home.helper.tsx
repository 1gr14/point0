import { useEffect, useState } from 'react'
import { root } from '@/lib/client'

export const ExternalHelperComponent = () => {
  const [state, setState] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((state) => state + 1)
    }, 100)
    return () => {
      clearInterval(interval)
    }
  }, [])
  return (
    <div>
      <p>External Helperx: {state}</p>
      <button
        onClick={() => {
          setState(0)
        }}
      >
        Click me
      </button>
    </div>
  )
}

// export const ExternalHelperComponent2 = () => null

export const externalHelper2Component = root.lets.component().component(function X() {
  const [state, setState] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      setState((state) => state + 1)
    }, 100)
    return () => {
      clearInterval(interval)
    }
  }, [])
  return (
    <div>
      <p>External Helper: {state}</p>
      <button
        onClick={() => {
          setState(0)
        }}
      >
        Click me
      </button>
    </div>
  )
})

export const externalHelper3Component = root.lets.component().component(ExternalHelperComponent)

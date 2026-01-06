import { client } from '@/lib/client'
import { useEffect, useState } from 'react'

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
      <p>External Helperooo: {state}</p>
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

export const ExternalHelperComponent2 = client.lets('component', 'externalHelper2').component(function X() {
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

export const ExternalHelperComponent3 = client.lets('component', 'externalHelper2').component(ExternalHelperComponent)

import { client } from '@/lib/client'
import { queryClient } from '@/lib/query-client'
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

export const myMut = client
  .lets('mutation', 'myMut')
  .loader(async ({ ctx }) => {
    return {
      z: Math.random(),
    }
  })
  .mutation()

// export const ExternalHelperComponent2 = client.lets('component', 'externalHelper2').component(() => {
export const ExternalHelperComponent2 = client
  .lets('component', 'externalHelper2')
  .loader(() => {
    return {
      x: 12,
    }
  })
  .component(function X(o) {
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
        <p>
          External Helper: {state},xxx,,{o.data.x}
        </p>
        <button
          onClick={() => {
            void queryClient.get().refetchQueries({ queryKey: ExternalHelperComponent2.getQueryKey() })
            setState(0)
          }}
        >
          Click me
        </button>
      </div>
    )
  })

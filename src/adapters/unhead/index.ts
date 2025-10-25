import { UnheadProvider, createHead } from '@unhead/react/client'
import { createElement } from 'react'

// eslint-disable-next-line @typescript-eslint/promise-function-async
export const Unhead = ({ children }: { children: React.ReactNode }) => {
  // TODO: remove dead code by prvoide CLIENT_ONLY=true env variable
  if (typeof window !== 'undefined') {
    return createElement(UnheadProvider, { head: createHead(), children })
  } else {
    return (async () => {
      const { UnheadProvider: UnheadProviderServer, createHead: createHeadServer } = await import(
        '@unhead/react/server'
      )
      return createElement(UnheadProviderServer, { value: createHeadServer(), children })
    })()
  }
}

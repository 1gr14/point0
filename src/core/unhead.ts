import { UnheadProvider, createHead } from '@unhead/react/client'
import { createElement } from 'react'

export const Unhead = ({ children }: { children: React.ReactNode }): React.ReactNode | Promise<React.ReactNode> => {
  if (typeof window !== 'undefined') {
    return createElement(UnheadProvider, { head: createHead(), children })
  } else {
    if (process.env.SERVER_ONLY) {
      return (async () => {
        const { UnheadProvider: UnheadProviderServer, createHead: createHeadServer } = await import(
          '@unhead/react/server'
        )
        return createElement(UnheadProviderServer, { value: createHeadServer(), children })
      })()
    } else {
      return children
    }
  }
}

import { UnheadProvider, createHead } from '@unhead/react/client'
import { createElement } from 'react'
import { ClientServerHelpers } from './client-server.js'

export const Unhead = ({ children }: { children: React.ReactNode }): React.ReactNode | Promise<React.ReactNode> => {
  if (ClientServerHelpers.isClient) {
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

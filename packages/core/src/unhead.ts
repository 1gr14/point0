import { UnheadProvider as UnheadProviderClient, createHead as createHeadClient } from '@unhead/react/client'
import { createElement } from 'react'
import type { ResolvableHead, Unhead } from 'unhead/types'
import { env } from '@point0/env'
import { SuperStore } from './index.js'

const clientHead = env.target.is.client ? createHeadClient() : (undefined as never)

export const UnheadProvider = ({
  children,
}: {
  children: React.ReactNode
}): React.ReactNode | Promise<React.ReactNode> => {
  if (env.target.is.client) {
    return createElement(UnheadProviderClient, { head: clientHead, children })
  } else {
    return (async () => {
      const { UnheadProvider: UnheadProviderServer } = await import('@unhead/react/server')
      const serverHead = SuperStore.getWeak<Unhead<ResolvableHead> | undefined>('__POINT0_UNHEAD_HEAD__')
      if (!serverHead) {
        throw new Error('Unhead head is not set on server, wrap your code with Unhead inside App component')
      }
      return createElement(UnheadProviderServer, { value: serverHead, children })
    })()
  }
}

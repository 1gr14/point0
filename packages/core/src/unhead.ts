import { UnheadProvider as UnheadProviderClient, createHead as createHeadClient } from '@unhead/react/client'
import { createElement } from 'react'
// import type { ResolvableHead, Unhead } from 'unhead/types'
import { _point0_env } from './env.js'
import { _ssItems } from './internals.js'

const clientHead = _point0_env.side.is.client ? createHeadClient() : (undefined as never)

export const UnheadProvider = ({
  children,
}: {
  children: React.ReactNode
}): React.ReactNode | Promise<React.ReactNode> => {
  if (_point0_env.side.is.client) {
    return createElement(UnheadProviderClient, { head: clientHead, children })
  } else {
    return (async () => {
      const { UnheadProvider: UnheadProviderServer } = await import('@unhead/react/server')
      const serverHead = _ssItems.__POINT0_UNHEAD_HEAD__.get()
      // if (!serverHead) {
      //   throw new Error('Unhead head is not set on server, wrap your code with Unhead inside App component')
      // }
      return createElement(UnheadProviderServer, { value: serverHead, children })
    })()
  }
}

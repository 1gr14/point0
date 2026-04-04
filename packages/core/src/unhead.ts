import { createHead as createHeadClient, UnheadProvider as UnheadProviderClient } from '@unhead/react/client'
import { UnheadProvider as UnheadProviderServer } from '@unhead/react/server'
import { createElement } from 'react'
import { _point0_env } from './env.js'
import { _ss } from './internals.js'

const clientHead = _point0_env.side.is.client ? createHeadClient() : (undefined as never)

export const UnheadProvider = ({
  children,
}: {
  children: React.ReactNode
}): React.ReactNode | Promise<React.ReactNode> => {
  if (_point0_env.side.is.client) {
    return createElement(UnheadProviderClient, { head: clientHead, children })
  } else {
    const serverHead = _ss.__POINT0_UNHEAD_SERVER_HEAD__.get()
    return createElement(UnheadProviderServer, { value: serverHead as never, children })
  }
}

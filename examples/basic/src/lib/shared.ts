import { client } from './client'

export const shared = client
  .lets('root', 'shared')
  .loader(() => ({
    shared1: 'shared22',
  }))
  .root()

export const sharedQuery = shared
  .lets('query', 'sharedQuery')
  .loader(({ data }) => ({
    ...data,
    shared2: 'shared11',
  }))
  .query()

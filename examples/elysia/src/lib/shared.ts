import { client } from './client'

export const shared = client.lets('root', 'shared').root()

export const sharedQuery = shared
  .lets('query', 'sharedQuery')
  .loader(() => ({
    shared1: 'shared22',
  }))
  .loader(({ data }) => ({
    ...data,
    shared2: 'shared11',
  }))
  .query()

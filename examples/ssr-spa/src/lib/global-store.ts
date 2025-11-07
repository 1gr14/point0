import { QueryClient } from '@tanstack/react-query'
import { GlobalStore } from 'point0/core/global-store.js'

export const $ = await GlobalStore.init({
  queryClient: () => new QueryClient(),
})

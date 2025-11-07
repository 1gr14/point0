import { QueryClient } from '@tanstack/react-query'
import { GlobalStore } from 'point0/core/global-store.js'

export const globalStore = await GlobalStore.init({
  queryClient: () => new QueryClient(),
})

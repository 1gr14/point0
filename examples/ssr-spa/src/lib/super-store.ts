import { QueryClient } from '@tanstack/react-query'
import { SuperStore } from 'point0/core/super-store.js'

export const queryClient = SuperStore.define('queryClient', () => new QueryClient())

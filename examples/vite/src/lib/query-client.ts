import { createQueryClient } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'

// Safe on both server and client — each SSR request gets its own instance.
export const queryClient = createQueryClient(() => new QueryClient())

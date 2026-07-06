import { createQueryClient } from '@point0/core'

// Safe on both server and client — each SSR request gets its own instance.
export const queryClient = createQueryClient()

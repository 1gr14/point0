import { createQueryClient } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = createQueryClient(() => new QueryClient())

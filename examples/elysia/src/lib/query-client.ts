import { QueryClient } from '@tanstack/react-query'
import { Point0 } from '@point0/core'

export const queryClient = Point0.defineQueryClient(() => new QueryClient())

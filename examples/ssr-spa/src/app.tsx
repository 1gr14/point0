import { QueryClientProvider } from '@tanstack/react-query'
import { points } from './lib/points'
import { queryClient } from './lib/react-query'
import { Wouter } from 'point0/adapters/wouter'
import { Unhead } from 'point0/adapters/unhead'

// you can add any other app wrappers here
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Unhead>
        <Wouter points={points} />
      </Unhead>
    </QueryClientProvider>
  )
}

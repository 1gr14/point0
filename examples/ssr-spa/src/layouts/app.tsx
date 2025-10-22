import { AppQueryClientProvider } from '../lib/react-query'

// you can add any other app wrappers here
export default function App({ children }: { children: React.ReactNode }) {
  return <AppQueryClientProvider>{children}</AppQueryClientProvider>
}

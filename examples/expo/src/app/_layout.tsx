import { QueryClientProvider } from '@point0/core'
import { Stack } from 'expo-router'

export default function RootLayout() {
  return (
    <QueryClientProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a2e' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          contentStyle: { backgroundColor: '#16213e' },
        }}
      />
    </QueryClientProvider>
  )
}

import { env, Point0 } from '@point0/core'
import superjson from 'superjson'
import { cors } from '@point0/cors'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000'

export const root = Point0.lets('root', 'root')
  .serverurl(SERVER_URL)
  .middleware(cors())
  .transformer(superjson)
  .queryOptions({
    retry: false,
    refetchOnWindowFocus: false,
  })
  .error(({ error }) => {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error.message}</Text>
        <Text style={styles.error}>{error.stack}</Text>
      </View>
    )
  })
  .loading(() => {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    )
  })
  .root()

const styles = env.side.define.unsafe.client(
  StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    error: {
      color: 'red',
    },
    loading: {
      color: '#e94560',
    },
  }),
)

// if (isLoading) {
//   return (
//     <View style={styles.center}>
//       <Stack.Screen options={{ title: 'Loading...' }} />
//       <ActivityIndicator size="large" color="#e94560" />
//     </View>
//   )
// }

// if (error || !data?.idea) {
//   return (
//     <View style={styles.center}>
//       <Stack.Screen options={{ title: 'Error' }} />
//       <Text style={styles.error}>{error?.message ?? 'Idea not found'}</Text>
//     </View>
//   )
// }

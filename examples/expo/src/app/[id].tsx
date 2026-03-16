import { root } from '@/lib/root'
import { Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { ideaQuery } from '../ideas'
import { env } from '@point0/core'

export const ideaScreenComponent = root
  .lets<{ id: number }>('component', 'idea')
  .with(ideaQuery, ({ props: { id } }) => ({ id }))
  .component(({ data: { idea } }) => {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: idea.title }} />
        <Text style={styles.title}>{idea.title}</Text>
        <Text style={styles.content}>{idea.content}</Text>
        <Text style={styles.date}>Created {new Date(idea.createdAt).toLocaleDateString()}</Text>
      </View>
    )
  })

export default env.side.define.unsafe.client(function IdeaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <ideaScreenComponent.X id={Number(id)} />
})

const styles = env.side.define.unsafe.client(
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#16213e',
      padding: 20,
    },
    center: {
      flex: 1,
      backgroundColor: '#16213e',
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      color: '#fff',
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 16,
    },
    content: {
      color: '#ccc',
      fontSize: 17,
      lineHeight: 26,
      marginBottom: 24,
    },
    date: {
      color: '#666',
      fontSize: 14,
    },
    error: {
      color: '#e94560',
      fontSize: 16,
    },
  }),
)

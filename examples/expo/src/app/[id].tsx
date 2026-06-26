import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { Stack, useLocalSearchParams } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import * as z from 'zod'

export const IdeaScreenComponent = root.lets
  .component()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input: { id } }) => {
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id } })
    return { idea }
  })
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

export default function IdeaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <IdeaScreenComponent input={{ id: Number(id) }} />
}

const styles = StyleSheet.create({
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
})

import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { ideasQuery, createIdeaMutation } from '../ideas'

export default function IdeasScreen() {
  const router = useRouter()
  const { data, isLoading, refetch } = ideasQuery.useQuery()
  const mutation = createIdeaMutation.useMutation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState('')

  const handleCreate = () => {
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required')
      return
    }
    setError('')
    mutation
      .mutateAsync({ title: title.trim(), content: content.trim() })
      .then(() => {
        setTitle('')
        setContent('')
        return refetch()
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Failed to create idea')
      })
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Ideas' }} />

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Title"
          placeholderTextColor="#666"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="What's your idea?"
          placeholderTextColor="#666"
          value={content}
          onChangeText={setContent}
          multiline
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={mutation.isPending}>
          <Text style={styles.buttonText}>{mutation.isPending ? 'Creating...' : 'Create Idea'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#e94560" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data?.ideas ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/${item.id}`)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No ideas yet. Create one above!</Text>}
        />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16213e',
  },
  form: {
    padding: 16,
    gap: 10,
  },
  input: {
    backgroundColor: '#1a1a2e',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  contentInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  error: {
    color: '#e94560',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDate: {
    color: '#888',
    fontSize: 13,
  },
  empty: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 24,
  },
})

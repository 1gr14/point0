import { useState } from 'react'
import { Link } from '@/lib/navigate'
import { root } from '@/lib/root'
import { createIdeaMutation, ideasQuery } from '@/ideas'

export default root
  .lets('page', 'ideas', '/ideas')
  .head('Ideas')
  .page(() => {
    const { data, isLoading, refetch } = ideasQuery.useQuery()
    const mutation = createIdeaMutation.useMutation()
    const [title, setTitle] = useState('My idea')
    const [content, setContent] = useState('A short description of the idea')
    const [error, setError] = useState('')
    console.info('Ideas page')

    return (
      <div>
        <h1>Ideas34</h1>
        <p>Create ideas with Prisma (SQLite).</p>

        <div style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 24 }}>
          <label>
            Title
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
            />
          </label>
          <label>
            Content
            <textarea
              rows={5}
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
              }}
            />
          </label>
          <button
            disabled={mutation.isPending}
            onClick={() => {
              const nextTitle = title.trim()
              const nextContent = content.trim()
              if (!nextTitle || !nextContent) {
                setError('Title and content are required')
                return
              }
              setError('')
              mutation
                .mutateAsync({ title: nextTitle, content: nextContent })
                .then(() => {
                  setTitle('')
                  setContent('')
                  return refetch()
                })
                .catch((e: unknown) => {
                  setError(e instanceof Error ? e.message : 'Failed to create idea')
                })
            }}
          >
            {mutation.isPending ? 'Creating...' : 'Create Idea'}
          </button>
          {error ? <p style={{ color: 'red' }}>{error}</p> : null}
        </div>
        {isLoading ? (
          <p>Loading ideas...</p>
        ) : (
          <ul>
            {(data?.ideas ?? []).map((idea) => (
              <li key={idea.id} style={{ marginBottom: 12 }}>
                <div>
                  <b>{idea.title}</b>
                </div>
                <div>{idea.content}</div>
              </li>
            ))}
          </ul>
        )}

        <p>
          <Link route="home">Back home</Link>
        </p>
      </div>
    )
  })

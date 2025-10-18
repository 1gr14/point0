import { useState } from 'react'
import type { Idea } from '../lib/prisma'

export const IdeasView = ({ data }: { data: { ideasCount: number; ideas: Idea[]; env: string | undefined } }) => {
  const [count, setCount] = useState(() => 0)
  return (
    <div>
      <h1>Ideas</h1>
      <p>Environment: {data.env}</p>
      <p
        onClick={() => {
          setCount(count + 1)
        }}
      >
        Here are all the amazing ideas shared by our community: {data.ideasCount + count}
      </p>
      <div>
        {data.ideas.map((idea) => (
          <div key={idea.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
            <h3>
              <a href={`/ideas/${idea.id}`}>{idea.title}</a>
            </h3>
            <p>{idea.description}</p>
          </div>
        ))}
      </div>
      <nav>
        <a href="/">← Back to Home</a>
      </nav>
    </div>
  )
}

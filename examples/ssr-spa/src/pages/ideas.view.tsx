import { Link } from 'point0/adapters/wouter'
import { useState } from 'react'
import type { Idea } from '../lib/prisma'
import { routes } from '../lib/routes'

export const IdeasView = ({ data }: { data: { ideasCount: number; ideas: Idea[]; env: string | undefined } }) => {
  const [count, setCount] = useState(() => 0)
  return (
    <div>
      <h1>Ideasxxcx</h1>
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
              <Link to={`/ideas/${idea.id}`}>{idea.title}</Link>
            </h3>
            <p>{idea.description}</p>
            <p>
              <Link to={routes.ideaNews.get({ id: idea.id })}>News</Link>
            </p>
          </div>
        ))}
      </div>
      <nav>
        <Link to="/">← Back to Home</Link>
      </nav>
    </div>
  )
}

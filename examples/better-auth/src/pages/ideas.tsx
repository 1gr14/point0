import { useState } from 'react'
import * as z from 'zod'
import { authClient } from '@/lib/auth/core'
import { authorizedOnlyPlugin } from '@/lib/auth/utils'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { routes } from '@/lib/routes'
import { root } from '@/lib/root'

export const createIdeaMutation = root
  .lets('mutation', 'createIdea')
  .input(
    z.object({
      title: z.string().min(1).max(120),
      content: z.string().min(1).max(2000),
    }),
  )
  .use(authorizedOnlyPlugin)
  .loader(async ({ ctx: { me }, input }) => {
    const idea = await prisma.idea.create({
      data: {
        title: input.title,
        content: input.content,
        authorId: me.user.id,
      },
      include: {
        author: true,
      },
    })

    return { idea }
  })
  .mutation()

export default root
  .lets('page', 'ideas', '/ideas')
  .loader(async () => {
    const ideas = await prisma.idea.findMany({
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    })
    return { ideas }
  })
  .head('Ideas')
  .page(({ data }) => {
    const mutation = createIdeaMutation.useMutation()
    const [title, setTitle] = useState('My first idea')
    const [content, setContent] = useState('Keep it simple and useful.')
    const [error, setError] = useState('')

    return (
      <div>
        <h1>Ideas</h1>
        {/* <p>
          Signed in as <b>{me.user.name}</b>
        </p> */}
        <p>
          <Link route="profile">Edit profile</Link> |{' '}
          <button
            onClick={() => {
              void authClient.signOut().then(() => {
                window.location.href = routes.home.get()
              })
            }}
          >
            Sign Out
          </button>
        </p>

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
              setError('')
              mutation
                .mutateAsync({ title, content })
                .then(() => {
                  window.location.reload()
                })
                .catch((e: unknown) => {
                  setError(e instanceof Error ? e.message : 'Failed to create idea')
                })
            }}
          >
            Create Idea
          </button>
          {error ? <p style={{ color: 'red' }}>{error}</p> : null}
        </div>

        <ul>
          {data.ideas.map((idea) => (
            <li key={idea.id} style={{ marginBottom: 12 }}>
              <Link route="idea" input={{ id: idea.id }}>
                {idea.title}
              </Link>
              <div>
                Author: <b>{idea.author.name}</b>
              </div>
            </li>
          ))}
        </ul>
      </div>
    )
  })

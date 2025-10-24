import { routes } from '../lib/routes.js'
import { client } from '../lib/client.js'
import { useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'

export const createIdeaMutation = client
  .input(
    z.object({
      title: z.string(),
      description: z.string(),
      content: z.string(),
    }),
  )
  .response(async ({ input, ctx }) => {
    const idea = await ctx.prisma.idea.create({
      data: input,
    })
    return { idea }
  })

export default client
  .route(routes.newIdea)
  .title('New Idea')
  .page(() => {
    // any hook or whatever here, it is just client code
    const mutation = useMutation(createIdeaMutation.getMutationOptions())
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')
    return (
      <div>
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
          }}
        />
        <label>Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
          }}
        />
        <label>Content</label>
        <input
          type="text"
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
          }}
        />
        <button
          onClick={() => {
            mutation.mutate({ title, description, content })
          }}
        >
          Create Idea
        </button>
      </div>
    )
  })

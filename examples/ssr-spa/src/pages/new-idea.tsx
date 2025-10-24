import { routes } from '../lib/routes.js'
import { client } from '../lib/client.js'
import { useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'

export const createIdeaMutation = client
  .id('createIdea')
  .input(
    z.object({
      title: z.string().min(1).max(10),
      description: z.string().min(1).max(100),
      content: z.string().min(1).max(1000),
    }),
  )
  .json(async ({ input, ctx }) => {
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
    const [title, setTitle] = useState('a')
    const [description, setDescription] = useState('b')
    const [content, setContent] = useState('c')
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
            mutation
              .mutateAsync({ title, description, content })
              .then((res) => {
                console.log('res', res)
              })
              .catch((err: unknown) => {
                console.log('err', err)
              })
          }}
        >
          Create Idea
        </button>
      </div>
    )
  })

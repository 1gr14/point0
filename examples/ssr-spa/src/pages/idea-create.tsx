import { routes } from '../lib/routes.js'
import { client } from '../lib/client.js'
import { useState } from 'react'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { generalLayout } from '../layouts/general.js'

export const createIdeaMutation = client
  .lets('mutation')
  .id('createIdea')
  .input(
    z.object({
      title: z.string().min(1).max(10),
      description: z.string().min(1).max(100),
      content: z.string().min(1).max(1000),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const idea = await ctx.prisma.idea.create({
      data: input,
    })
    return { idea }
  })

export const generateIdeaMutation = client
  .lets('response')
  .id('generateIdea')
  .response(async ({ input, ctx }) => {
    const stream = new ReadableStream({
      async start(controller) {
        const text = 'x'.repeat(100) // 100 symbols
        for (const char of text) {
          controller.enqueue(char)
          await new Promise((resolve) => setTimeout(resolve, 10)) // 10 ms delay per symbol
        }
        controller.close()
      },
    })

    // Return a streaming response
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  })

export default generalLayout
  .lets('page')
  .id('newIdeaPage')
  .route(routes.newIdea)
  .title('New Idea')
  .page(() => {
    // any hook or whatever here, it is just client code
    const mutation = useMutation(createIdeaMutation.getMutationOptions())
    const [title, setTitle] = useState('a')
    const [description, setDescription] = useState('b')
    const [content, setContent] = useState('c')
    const [generated, setGenerated] = useState('')
    return (
      <div>
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
        <div>
          <p>{generated}</p>
          <button
            onClick={() => {
              generateIdeaMutation
                .fetch()
                .then(async (res) => {
                  if (!res.body) {
                    setGenerated('No body')
                    return
                  }
                  const reader = res.body.getReader()
                  const decoder = new TextDecoder()
                  let result = ''

                  while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    const chunk = decoder.decode(value, { stream: true })
                    result += chunk
                    setGenerated(result)
                  }

                  console.log('Final result:', result)
                })
                .catch((err: unknown) => {
                  console.log('err', err)
                  setGenerated(`Error generating idea: ${err instanceof Error ? err.message : String(err)}`)
                })
            }}
          >
            Generate Idea
          </button>
        </div>
      </div>
    )
  })

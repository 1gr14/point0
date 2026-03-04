import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import * as z from 'zod'
import { generalLayout } from '../layouts/general.js'
import { client } from '../lib/client.js'

export const createIdeaMutation = client
  .lets('action', 'createIdea')
  .input(
    z.object({
      title: z.string().min(1).max(10),
      description: z.string().min(1).max(100),
      content: z.string().min(1).max(1000),
    }),
  )
  .loader(async ({ input, ctx }) => {
    const idea = await ctx.prisma.idea.create({
      data: input,
    })
    return { idea }
  })
  .mutation({
    onSuccess: () => {
      console.info('success')
    },
  })
  .action()

export const generateIdeaMutation = client
  .lets('action', 'generateIdea')
  .loader(async () => {
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
  .mutation()
  .action()

const Page = () => {
  // any hook or whatever here, it is just client code
  const mutation = useMutation(createIdeaMutation.getMutationOptions())
  const [title, setTitle] = useState(() => 'a')
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
                console.info('res', res)
              })
              .catch((err: unknown) => {
                console.info('err', err)
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
                console.info('res', res)
                if (!res.body) {
                  setGenerated('No body')
                  return
                }
                const reader = res.body.getReader()
                const decoder = new TextDecoder()
                let result = ''

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  const chunk = decoder.decode(value, { stream: true })
                  result += chunk
                  setGenerated(result)
                }

                console.info('Final result:', result)
              })
              .catch((err: unknown) => {
                console.error('err', err)
                setGenerated(`Error generating idea: ${err instanceof Error ? err.message : String(err)}`)
              })
          }}
        >
          Generate Idea
        </button>
      </div>
    </div>
  )
}

export default generalLayout.lets('page', 'newIdea', '/ideas/new').head('New Idea').page(Page)

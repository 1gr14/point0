import { client } from '@/lib/client.js'
import { useState } from 'react'
import * as z from 'zod'
import { generalLayout } from '../layouts/general.js'
import { BestIdeaComponent } from './home.js'
import { testCookie } from '@/lib/cookies.js'

export const createIdeaMutation = client
  .lets('mutation', 'createIdea')
  // .input(
  //   z.object({
  //     title: z.string().min(1).max(10),
  //     description: z.string().min(1).max(100),
  //     content: z.string().min(1).max(1000),
  //   }),
  // )
  .input(
    z.object({
      title: z.string().min(1).max(10),
      date: z.date(),
    }),
  )
  .ctx([{ zz: 'ZZ' }])
  .ctx([{ ooo: 'OOO' }])
  .ctx([{ yy: 'YY', xx: 'XX' }, 'xx'])
  .loader(async (o) => {
    return { ...o.input, xx: o.xx }
  })
  .input(
    z.object({
      description: z.string().min(1).max(100),
    }),
  )
  .loader(async ({ input, data, inputRaw }) => {
    return { ...data }
  })
  .input(
    z.object({
      content: z.string().min(1).max(1000),
    }),
  )
  .loader(async ({ input, data, execute, inputRaw }) => {
    const result = await execute(BestIdeaComponent, { x: 22, y: 2 })
    if (result.error) {
      throw result.error
    }
    return { ...data, ...result.data }
  })
  .loader(async ({ input, ctx, inputRaw, data }) => {
    const idea = await ctx.prisma.idea.create({
      data: input,
    })
    return { idea, ...data }
  })
  .clientLoader(async (o) => {
    console.info('o', o.data.xx)
    return { ...o.data, x: 1 }
  })
  .mutation({
    onSuccess: (x) => {
      console.info('success', x)
    },
    onMutate: (x) => {
      console.info('mutate', x)
    },
  })

export const generateIdeaMutation = client
  .lets('mutation', 'generateIdea')
  .loader(async ({ input, ctx, set, request }) => {
    testCookie.set(Math.random().toString())
    console.info('request from ip', request.from.ip)
    set.headers('X-Y', 'zxczxc')
    set.cookies('X-Y', 'kjhkj')
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

export const clientFnMutation = client
  .lets('mutation', 'clientFnMutation')
  .clientLoader(async ({ input, data }) => {
    return new Response('HELLO!', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  })
  .mutation()

export const clientFnMutationX = client
  .lets('mutation', 'clientFnMutation')
  .loader(async ({ input, data }) => {
    return new Response('HELLO!', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  })
  .mutation()

export const clientFn2Mutation = client
  .lets('mutation', 'clientFn2Mutation')
  .loader(async ({ input, ctx }) => {
    const stream = new ReadableStream({
      async start(controller) {
        const text = 'o'.repeat(100) // 100 symbols
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
  .clientLoader(async ({ input, data }) => {
    return { x: 123 }
  })
  .clientLoader(async ({ input, data }) => {
    return new Response('HELLO!', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  })
  .mutation()

const Page = () => {
  // any hook or whatever here, it is just client code
  const mutation = createIdeaMutation.useMutation()
  const generateIdea = generateIdeaMutation.useMutation()
  const clientFn = clientFnMutation.useMutation()
  const clientFn2 = clientFn2Mutation.useMutation()
  const [title, setTitle] = useState(() => 'a')
  const [description, setDescription] = useState('b')
  const [content, setContent] = useState('c')
  const [generated, setGenerated] = useState('')

  return (
    <div>
      <div>
        <label>Title1: {testCookie.get()}</label>
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
              .mutateAsync({ title, description, content, date: new Date() })
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
            clientFn
              .mutateAsync()
              .then((res) => {
                console.info('res', res)
              })
              .catch((err: unknown) => {
                console.info('err', err)
              })
          }}
        >
          Client Fn
        </button>
        <button
          onClick={() => {
            clientFn2
              .mutateAsync()
              .then((res) => {
                console.info('res', res)
              })
              .catch((err: unknown) => {
                console.info('err', err)
              })
          }}
        >
          Client Fn 2
        </button>
        <button
          onClick={() => {
            generateIdea
              .mutateAsync()
              .then(async (res) => {
                console.info('res', res)
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

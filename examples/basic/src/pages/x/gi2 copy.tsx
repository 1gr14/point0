import { client } from '@/lib/client.js'
import { testCookie, testNumberCookie, testNumberDefaultCookie } from '@/lib/cookies.js'
import { useState } from 'react'
import { generalLayout } from '../../layouts/general.js'

export const generateIdeaMutation = client
  .lets('mutation', 'generateIdea2')
  .loader(async () => {
    testCookie.set(Math.random().toString())
    const stream = new ReadableStream({
      async start(controller) {
        const text = 'j'.repeat(100) // 100 symbols
        for (const char of text) {
          controller.enqueue(char)
          await new Promise((resolve) => setTimeout(resolve, 10)) // 10 ms delay per symbol
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  })
  .mutation()

export const gi1Page = generalLayout
  .lets('page', 'gi2', '/gi2')
  .head('New Idea')
  .page(() => {
    // any hook or whatever here, it is just client code
    const generateIdea = generateIdeaMutation.useMutation()
    const [title, setTitle] = useState(() => 'a')
    const [description, setDescription] = useState('b')
    const [content, setContent] = useState('c')
    const [generated, setGenerated] = useState('')
    const testCookieValue = testCookie.use()
    const testNumberCookieValue = testNumberCookie.use()
    const testNumberDefaultCookieValue = testNumberDefaultCookie.use()

    return (
      <div>
        <div>
          <label>
            Title133: {testCookieValue}, {testNumberCookieValue}, {testNumberDefaultCookieValue}
          </label>
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
        </div>
        <div>
          <p>{generated}</p>
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
  })

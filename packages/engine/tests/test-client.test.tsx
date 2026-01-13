import { Point0, QueryClientProvider } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/test-client.js'
import { withFakeBrowser } from './utils/fake-browser.js'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Router } from '@point0/wouter'
import assert from 'node:assert'

describe('FakeClient', () => {
  it('should fetch page with loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ x: 1 }))
      .page(({ data }) => <div>Hello {data.x}</div>)
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      clients: [[root, page]],
    })
    const fakeClient = FakeClient.create({ engine, scope: 'root' })
    await fakeClient.run(async () => {
      const data = await page.fetch()
      expect(data.x).toBe(1)
    })
  })

  it('should execute page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ ...data, y: 2 }))
      .page(({ data }) => (
        <div>
          Hello {data.x} {data.y}
        </div>
      ))
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      clients: [[root, page]],
    })
    const fakeClient = FakeClient.create({ engine, scope: 'root' })
    await fakeClient.run(async () => {
      const data = await page.execute()
      expect(data.x).toBe(1)
      expect(data.y).toBe(2)
    })
  })

  it('should render page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    let counter = 0
    const mutation = root
      .lets('mutation', 'mutation')
      .loader(() => ({ index: counter++ }))
      .mutation()
    const page = root
      .lets('page', 'page', '/')
      .loader(() => ({ x: 1 }))
      .clientLoader(({ data }) => ({ ...data, y: 2 }))
      .page(({ data }) => {
        const inc = mutation.useMutation()
        return (
          <div>
            Hello {data.x} {data.y}
            <button
              onClick={() => {
                inc.mutateAsync().catch((err: unknown) => {
                  console.error(err)
                })
              }}
            >
              Increment {inc.data?.index ?? '-'}
            </button>
          </div>
        )
      })
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      clients: [[root, page, mutation]],
    })
    const fakeClient = FakeClient.create({ engine, scope: 'root' })
    await fakeClient.run(async () => {
      await withFakeBrowser(async () => {
        const { container } = render(
          <QueryClientProvider>
            <Router />
          </QueryClientProvider>,
        )

        await waitFor(() => {
          const element = container.querySelector('div')
          expect(element).toBeDefined()
          expect(element?.textContent).toContain('Hello 1 2')
        })

        console.log('Initial Container HTML:', container.innerHTML)

        // Subscribe to HTML changes
        const observer = new window.MutationObserver((mutations) => {
          console.log('HTML Changed:', container.innerHTML)
          mutations.forEach((mutation) => {
            // console.log('Mutation:', {
            //   type: mutation.type,
            //   target: mutation.target,
            //   addedNodes: Array.from(mutation.addedNodes).map((n) => n.textContent),
            //   removedNodes: Array.from(mutation.removedNodes).map((n) => n.textContent),
            //   attributeName: mutation.attributeName,
            //   oldValue: mutation.oldValue,
            // })
          })
        })

        observer.observe(container, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
          attributeOldValue: true,
          characterDataOldValue: true,
        })

        const button = container.querySelector('button')
        assert(button)
        expect(button.textContent).toBe('Increment -')
        fireEvent.click(button)
        await waitFor(() => expect(button.textContent).toBe('Increment 0'))
        fireEvent.click(button)
        await waitFor(() => expect(button.textContent).toBe('Increment 1'))
        observer.disconnect()
      })
    })
  })
})

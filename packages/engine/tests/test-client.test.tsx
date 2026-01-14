import { Point0, QueryClientProvider } from '@point0/core'
import '@testing-library/jest-dom'
import { describe, expect, it } from 'bun:test'
import { Engine } from '../src/engine.js'
import { FakeClient } from '../src/test-client.js'
import { withFakeBrowser } from './utils/fake-browser.js'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { Router } from '@point0/wouter'
import assert from 'node:assert'
import { env } from '@point0/env'

describe('FakeClient', () => {
  it('should fetch page with loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ serverLoaderTargetName: env.target.name }))
      .page(({ data }) => <div>Hello from {data.serverLoaderTargetName}</div>)
    expect(env.target.name).toBe('server')
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      clients: [[root, page]],
    })
    expect(env.target.name).toBe('server')
    const fakeClient = FakeClient.create({ engine, scope: 'root' })
    await fakeClient.run(async () => {
      expect(env.target.name).toBe('client')
      const data = await page.fetch()
      expect(env.target.name).toBe('client')
      expect(data.serverLoaderTargetName).toBe('server')
    })
    expect(env.target.name).toBe('server')
  })

  it('should execute page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    const page = root
      .lets('page', 'page')
      .loader(() => ({ serverLoaderTargetName: env.target.name }))
      .clientLoader(({ data }) => ({ ...data, clientLoaderTargetName: env.target.name }))
      .page(({ data }) => (
        <div>
          Hello from {data.serverLoaderTargetName} and {data.clientLoaderTargetName}
        </div>
      ))
    const engine = await Engine.init({
      compiler: false,
      file: import.meta.url,
      clients: [[root, page]],
    })
    const fakeClient = FakeClient.create({ engine, scope: 'root' })
    expect(env.target.name).toBe('server')
    await fakeClient.run(async () => {
      expect(env.target.name).toBe('client')
      const data = await page.execute()
      expect(env.target.name).toBe('client')
      expect(data.serverLoaderTargetName).toBe('server')
      expect(data.clientLoaderTargetName).toBe('client')
    })
    expect(env.target.name).toBe('server')
  })

  it.only('should render page with loader and client loader', async () => {
    const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
    let counter = 0
    const mutation = root
      .lets('mutation', 'mutation')
      .loader(() => ({ index: counter++, serverMutationTargetName: env.target.name }))
      .clientLoader(({ data }) => ({ ...data, clientMutationTargetName: env.target.name }))
      .mutation()
    const page = root
      .lets('page', 'page', '/')
      .loader(() => ({ x: 1, serverLoaderTargetName: env.target.name }))
      .clientLoader(({ data }) => ({ ...data, clientLoaderTargetName: env.target.name }))
      .page(({ data }) => {
        const inc = mutation.useMutation()
        console.log('inc.data', inc.data)
        return (
          <div>
            <div id="pageTargetName">{env.target.name}</div>
            <div id="serverLoaderTargetName">{data.serverLoaderTargetName}</div>
            <div id="clientLoaderTargetName">{data.clientLoaderTargetName}</div>
            <div id="serverMutationTargetName">{inc.data?.serverMutationTargetName || '-'}</div>
            <div id="clientMutationTargetName">{inc.data?.clientMutationTargetName || '-'}</div>
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
          expect(container.querySelector('#pageTargetName')?.textContent).toBe('client')
        })
        const button = container.querySelector('button')
        assert(button)
        fireEvent.click(button)
        await waitFor(() => expect(button.textContent).toBe('Increment 0'))
        fireEvent.click(button)
        await waitFor(() => expect(button.textContent).toBe('Increment 1'))
        expect(container.querySelector('#serverLoaderTargetName')?.textContent).toBe('server')
        expect(container.querySelector('#clientLoaderTargetName')?.textContent).toBe('client')
        expect(container.querySelector('#serverMutationTargetName')?.textContent).toBe('server')
        expect(container.querySelector('#clientMutationTargetName')?.textContent).toBe('client')
      })
    })
  })

  // it('should render page with loader and client loader', async () => {
  //   const root = Point0.lets('root', 'root').serverurl('http://localhost:3000').root()
  //   let counter = 0
  //   const mutation = root
  //     .lets('mutation', 'mutation')
  //     .loader(() => ({ index: counter++ }))
  //     .mutation()
  //   const page = root
  //     .lets('page', 'page', '/')
  //     .loader(() => ({ x: 1 }))
  //     .clientLoader(({ data }) => ({ ...data, y: 2 }))
  //     .page(({ data }) => {
  //       const inc = mutation.useMutation()
  //       return (
  //         <div>
  //           Hello {data.x} {data.y}
  //           <button
  //             onClick={() => {
  //               inc.mutateAsync().catch((err: unknown) => {
  //                 console.error(err)
  //               })
  //             }}
  //           >
  //             Increment {inc.data?.index ?? '-'}
  //           </button>
  //         </div>
  //       )
  //     })
  //   const engine = await Engine.init({
  //     compiler: false,
  //     file: import.meta.url,
  //     clients: [[root, page, mutation]],
  //   })
  //   const fakeClient = FakeClient.create({ engine, scope: 'root' })
  //   await fakeClient.run(async () => {
  //     await withFakeBrowser(async () => {
  //       const { container } = render(
  //         <QueryClientProvider>
  //           <Router />
  //         </QueryClientProvider>,
  //       )

  //       await waitFor(() => {
  //         const element = container.querySelector('div')
  //         expect(element).toBeDefined()
  //         expect(element?.textContent).toContain('Hello 1 2')
  //       })

  //       console.log('Initial Container HTML:', container.innerHTML)

  //       // Subscribe to HTML changes
  //       const observer = new window.MutationObserver((mutations) => {
  //         console.log('HTML Changed:', container.innerHTML)
  //         mutations.forEach((mutation) => {
  //           // console.log('Mutation:', {
  //           //   type: mutation.type,
  //           //   target: mutation.target,
  //           //   addedNodes: Array.from(mutation.addedNodes).map((n) => n.textContent),
  //           //   removedNodes: Array.from(mutation.removedNodes).map((n) => n.textContent),
  //           //   attributeName: mutation.attributeName,
  //           //   oldValue: mutation.oldValue,
  //           // })
  //         })
  //       })

  //       observer.observe(container, {
  //         childList: true,
  //         subtree: true,
  //         attributes: true,
  //         characterData: true,
  //         attributeOldValue: true,
  //         characterDataOldValue: true,
  //       })

  //       const button = container.querySelector('button')
  //       assert(button)
  //       expect(button.textContent).toBe('Increment -')
  //       fireEvent.click(button)
  //       await waitFor(() => expect(button.textContent).toBe('Increment 0'))
  //       fireEvent.click(button)
  //       await waitFor(() => expect(button.textContent).toBe('Increment 1'))
  //       observer.disconnect()
  //     })
  //   })
  // })
})

import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { fireEvent, render, waitFor } from '@testing-library/react'
import { ElementViewer } from '../element-viewer.js'
import { getFakeBrowserGlobals, getOriginalValuesOfFakeBrowserGlobals } from '../internal-testing.js'
import assert from 'node:assert'

setDefaultTimeout(10000)

const originals = getOriginalValuesOfFakeBrowserGlobals()

describe('element-viewer', () => {
  beforeAll(() => {
    Object.assign(globalThis, getFakeBrowserGlobals())
  })

  afterAll(() => {
    Object.assign(globalThis, originals)
  })

  it('parse initial', async () => {
    const { container } = render(
      <div id="root">
        <p>Hello</p>
      </div>,
    )
    const viewer = ElementViewer.create(container)
    expect(await viewer.tale()).toMatchInlineSnapshot(`
      "/
        p: Hello
      "
    `)
  })

  it('watch changes', async () => {
    const { container } = render(
      <div id="root">
        <p>Hello</p>
        <button
          id="first"
          onClick={() => {
            const p = container.querySelector('p')
            assert(p)
            p.textContent = 'World'
          }}
        >
          x
        </button>
        <button
          id="second"
          onClick={() => {
            const p = container.querySelector('p')
            assert(p)
            p.textContent = 'Hello'
          }}
        >
          x
        </button>
      </div>,
    )
    const viewer = ElementViewer.create(container)
    const button1 = container.querySelector('#first')
    assert(button1)
    const button2 = container.querySelector('#second')
    assert(button2)
    fireEvent.click(button1)
    await waitFor(() => {
      expect(container.querySelector('p')?.textContent).toBe('World')
    })
    viewer.setUrl('/2')
    fireEvent.click(button2)
    // await waitFor(() => {
    //   expect(container.querySelector('p')?.textContent).toBe('Hello')
    // })
    expect(await viewer.tale()).toMatchInlineSnapshot(`
      "/
        p: Hello
        #first: x
        #second: x

        p: World
        #first: x
        #second: x

      /2
        p: Hello
        #first: x
        #second: x
      "
    `)
  })
})

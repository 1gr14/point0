import { cleanup } from '@testing-library/react'

type GlobalSnapshot = {
  window?: any
  document?: any
  navigator?: any
  location?: any
  HTMLElement?: any
  Node?: any
}

function snapshotGlobals(): GlobalSnapshot {
  return {
    window: globalThis.window,
    document: globalThis.document,
    navigator: globalThis.navigator,
    location: globalThis.location,
    HTMLElement: globalThis.HTMLElement,
    Node: globalThis.Node,
  }
}

function restoreGlobals(snapshot: GlobalSnapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete globalThis[key as keyof typeof globalThis]
    } else {
      // @ts-expect-error we know that key is a key of globalThis
      globalThis[key as keyof typeof globalThis] = value
    }
  }
}

function setupFakeBrowser() {
  try {
    // Bun / fast path
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Window } = require('happy-dom')
    const window = new Window()

    globalThis.window = window
    globalThis.document = window.document
    globalThis.navigator = window.navigator
    globalThis.location = window.location
    globalThis.HTMLElement = window.HTMLElement
    globalThis.Node = window.Node
  } catch {
    // Node / Jest fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!doctype html><html><body></body></html>')

    globalThis.window = dom.window
    globalThis.document = dom.window.document
    globalThis.navigator = dom.window.navigator
    globalThis.location = dom.window.location
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Node = dom.window.Node
  }
}

export async function withFakeBrowser<T>(fn: () => T | Promise<T>): Promise<T> {
  const snapshot = snapshotGlobals()
  try {
    setupFakeBrowser()
    return await fn()
  } finally {
    cleanup()
    restoreGlobals(snapshot)
  }
}

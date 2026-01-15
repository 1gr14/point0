import type { RawPointsDefinition } from '@point0/core'
import { Engine } from '../../src/engine.js'
import { FakeClient } from '../../src/test-client.js'
import { cleanup } from '@testing-library/react'
import nodePath from 'node:path'

export const getFakeBrowserGlobals = (options: { url?: string } = {}) => {
  const url = options.url ?? 'http://localhost/'
  try {
    // Bun / fast path
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Window } = require('happy-dom')
    const window = new Window({
      url,
    })
    return {
      window,
      document: window.document,
      navigator: window.navigator,
      location: window.location,
      HTMLElement: window.HTMLElement,
      Node: window.Node,
    }
  } catch {
    // Node / Jest fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom')
    const dom = new JSDOM('<!doctype html><html><body></body></html>', {
      url,
    })
    return {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
      location: dom.window.location,
      HTMLElement: dom.window.HTMLElement,
      Node: dom.window.Node,
    }
  }
}

export const createTestThings = async (points: RawPointsDefinition) => {
  const engine = await Engine.init({
    compiler: false,
    file: nodePath.resolve(__dirname, '../temp/never'),
    clients: [points],
  })
  const client = FakeClient.create({
    engine,
    scope: 'root',
    globals: getFakeBrowserGlobals(),
    cleanup,
  })
  return {
    engine,
    client,
  }
}

import { cleanup } from '@testing-library/react'
import nodePath from 'node:path'
import { Engine } from '../../src/engine.js'
import { FakeClient } from '../../src/fake-client.js'
import type { PointsDefinitionSource } from '@point0/core'
import { Window } from 'happy-dom'

// export const getFakeBrowserGlobals = (options: { url?: string } = {}) => {
//   const url = options.url ?? 'http://localhost/'
//   const window = new Window({
//     url,
//   })
//   // Get all enumerable properties from window
//   const globals: Record<string, any> = {}
//   // eslint-disable-next-line guard-for-in
//   for (const key in window) {
//     globals[key] = (window as any)[key]
//   }
//   return globals
// }

export const getFakeBrowserGlobals = (options: { url?: string } = {}) => {
  const url = options.url ?? 'http://localhost/'
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
    DOMParser: window.DOMParser,
  }
}

export const createTestThings = async (points: PointsDefinitionSource) => {
  const engine = await Engine.init({
    compiler: false,
    file: nodePath.resolve(__dirname, '../temp/never'),
    server: { scope: 'root', points },
    clients: [{ scope: 'root', points }],
  })
  const client = FakeClient.create({
    engine,
    scope: 'root',
    globals: getFakeBrowserGlobals(),
    onDestroyInside: () => cleanup(),
  })
  return {
    engine,
    client,
  }
}

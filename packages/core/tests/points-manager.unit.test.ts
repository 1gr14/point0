import { describe, expect, it } from 'bun:test'
import React from 'react'
import { Point0 } from '../src/point0.js'
import { PointsManager, PointsSourceNotReadyError } from '../src/points-manager.js'

const getFC = () => () => React.createElement('div', { children: 'X' })

describe('PointsManager', () => {
  describe('createFromSource', () => {
    it('should create points manager from source (module)', async () => {
      const root = Point0.lets('root', 'base').root()
      const page = root.lets('page', '1', '/1').page(getFC())
      const source = async () => ({
        default: [root, page] as const,
      })
      const points = await PointsManager.createFromSource(source)
      expect(points.collection.map((p) => p.name)).toEqual(['base', '1'])
    })

    // Vite HMR / SSR ModuleRunner can re-import the points module mid-invalidation, yielding a
    // module whose `default` export is transiently undefined (or an empty namespace). It must be a
    // distinguishable, catchable signal — not a silent crash — so callers can keep last-good points.
    it('throws PointsSourceNotReadyError when the module default is transiently undefined', async () => {
      const source = async () => ({ default: undefined as never })
      await expect(PointsManager.createFromSource(source)).rejects.toBeInstanceOf(PointsSourceNotReadyError)
    })

    it('throws PointsSourceNotReadyError when the module namespace has no default yet', async () => {
      const source = async () => ({}) as never
      await expect(PointsManager.createFromSource(source)).rejects.toBeInstanceOf(PointsSourceNotReadyError)
    })
  })

  // A point's id is `scope:type:name` — the key everything downstream is indexed by (the server points index, the
  // client socket registries, the query keys). Two points of one type sharing a name inside a scope would shadow each
  // other, so the manager refuses the whole collection at creation, before anything can resolve the wrong one.
  describe('duplicates', () => {
    const findDuplicate = (points: unknown[]): string => {
      try {
        PointsManager.createFromDefinition(points as never)
      } catch (error) {
        return (error as Error).message
      }
      throw new Error('expected the duplicate to be refused, but the collection was accepted')
    }

    it('refuses two points of the same type sharing a name, naming both as scope.type.name', () => {
      const root = Point0.lets('root', 'dupPages').root()
      const first = root.lets('page', 'home', '/').page(getFC())
      const second = root.lets('page', 'home', '/home').page(getFC())
      expect(findDuplicate([root, first, second])).toBe(
        'Duplicate points found:\ndupPages.page.home, dupPages.page.home',
      )
    })

    // Socket points are duplicate-checked exactly like pages and queries — the same collection pass, the same message.
    // They need it MORE: the wire addresses them by name (a frame names its handler, a `claimed` frame its spaces) and
    // a room topic is namespaced by the space name alone.
    it('refuses two channel points sharing a name', () => {
      const root = Point0.lets('root', 'dupChannels').root()
      const first = root.lets('channel', 'app').channel()
      const second = root.lets('channel', 'app').channel()
      expect(findDuplicate([root, first, second])).toBe(
        'Duplicate points found:\ndupChannels.channel.app, dupChannels.channel.app',
      )
    })

    it('refuses two space points sharing a name, even under different channels', () => {
      const root = Point0.lets('root', 'dupSpaces').root()
      const chat = root
        .lets('channel', 'chat')
        .connector(() => ({ me: 'u1' }))
        .channel()
      const game = root
        .lets('channel', 'game')
        .connector(() => ({ me: 'u1' }))
        .channel()
      const first = chat
        .lets('space', 'board')
        .joiner(() => ({}))
        .space()
      const second = game
        .lets('space', 'board')
        .joiner(() => ({}))
        .space()
      expect(findDuplicate([root, chat, game, first, second])).toBe(
        'Duplicate points found:\ndupSpaces.space.board, dupSpaces.space.board',
      )
    })

    it('refuses two handler points sharing a name, even under different channels', () => {
      const root = Point0.lets('root', 'dupHandlers').root()
      const chat = root
        .lets('channel', 'chat')
        .connector(() => ({ me: 'u1' }))
        .channel()
      const game = root
        .lets('channel', 'game')
        .connector(() => ({ me: 'u1' }))
        .channel()
      const first = chat
        .lets('serverHandler', 'ping')
        .serverReply(() => ({ ok: true }))
        .serverHandler()
      const second = game
        .lets('serverHandler', 'ping')
        .serverReply(() => ({ ok: true }))
        .serverHandler()
      expect(findDuplicate([root, chat, game, first, second])).toBe(
        'Duplicate points found:\ndupHandlers.serverHandler.ping, dupHandlers.serverHandler.ping',
      )
    })

    it('refuses two clientHandler points sharing a name', () => {
      const root = Point0.lets('root', 'dupClientHandlers').root()
      const chat = root
        .lets('channel', 'chat')
        .connector(() => ({ me: 'u1' }))
        .channel()
      const first = chat.lets('clientHandler', 'notify').clientHandler()
      const second = chat.lets('clientHandler', 'notify').clientHandler()
      expect(findDuplicate([root, chat, first, second])).toBe(
        'Duplicate points found:\ndupClientHandlers.clientHandler.notify, dupClientHandlers.clientHandler.notify',
      )
    })

    // The generated client manifest carries socket points as LAZY records (type/name/channel/space + a dynamic
    // import), never as point objects — the check must see through that shape too.
    it('refuses duplicates in the lazy manifest shape the generator emits', () => {
      const root = Point0.lets('root', 'dupLazy').root()
      const lazy = (record: { type: string; name: string; channel?: string; space?: string }) => ({
        ...record,
        point: async () => ({}) as never,
      })
      expect(
        findDuplicate([
          root,
          lazy({ type: 'channel', name: 'app' }),
          lazy({ type: 'channel', name: 'app' }),
          lazy({ type: 'space', name: 'board', channel: 'app' }),
          lazy({ type: 'space', name: 'board', channel: 'app' }),
          lazy({ type: 'serverHandler', name: 'ping', channel: 'app', space: 'board' }),
          lazy({ type: 'serverHandler', name: 'ping', channel: 'app' }),
        ]),
      ).toBe(
        'Duplicate points found:\n' +
          'dupLazy.channel.app, dupLazy.channel.app\n' +
          'dupLazy.space.board, dupLazy.space.board\n' +
          'dupLazy.serverHandler.ping, dupLazy.serverHandler.ping',
      )
    })

    // The id is `scope:type:name`, so the namespace is per TYPE: a channel and a space may share a name, and so may a
    // serverHandler and a clientHandler (the wire tells the two directions apart).
    it('allows one name across different socket point types', () => {
      const root = Point0.lets('root', 'sameNameTypes').root()
      const chat = root
        .lets('channel', 'chat')
        .connector(() => ({ me: 'u1' }))
        .channel()
      const space = chat
        .lets('space', 'chat')
        .joiner(() => ({}))
        .space()
      const serverHandler = chat
        .lets('serverHandler', 'ping')
        .serverReply(() => ({ ok: true }))
        .serverHandler()
      const clientHandler = chat.lets('clientHandler', 'ping').clientHandler()
      const points = PointsManager.createFromDefinition([root, chat, space, serverHandler, clientHandler] as never)
      expect(points.collection.map((record) => `${record.type}.${record.name}`)).toEqual([
        'root.sameNameTypes',
        'channel.chat',
        'space.chat',
        'serverHandler.ping',
        'clientHandler.ping',
      ])
    })
  })
})

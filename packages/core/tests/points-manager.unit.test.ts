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
})

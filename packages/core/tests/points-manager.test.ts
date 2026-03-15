import { describe, expect, it } from 'bun:test'
import React from 'react'
import { Point0 } from '../src/point0.js'
import { PointsManager } from '../src/points-manager.js'

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
  })
})

import { describe, expect, it } from 'bun:test'
import React from 'react'
import { Point0 } from '../src/index.js'
import { PointsManager } from '../src/points-manager.js'

// TODO: move all tests to separate files in test dir and refactor it

const PC = () => React.createElement('div', { children: 'X' })

describe('points', () => {
  describe('pagesTree', () => {
    it('no layout pages', () => {
      const base = Point0.create('base').root()
      const points = PointsManager.ready({
        _root_ready: base,
        one: base.lets('page', '1', '/1').page(PC).point,
        two: base.lets('page', '2', '/2').page(PC).point,
      })
      const pagesTreeSource = PointsManager.toPagesTreeSource({ points: points.collection })
      expect(pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['1', '2'],
          nested: undefined,
        },
      ])
    })

    it('one layout page', () => {
      const base = Point0.create('base').root()
      const layout = base.lets('layout', 'layout', '/layout').layout(PC).point
      const points = PointsManager.ready({
        _root_ready: base,
        one: base.lets('page', '1', '/1').page(PC).point,
        two: layout.lets('page', '2', '/2').page(PC).point,
      })
      const pagesTreeSource = PointsManager.toPagesTreeSource({ points: points.collection })
      expect(pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['1'],
          nested: undefined,
        },
        {
          layout: 'layout',
          pages: ['2'],
          nested: undefined,
        },
      ])
    })

    it('two layouts page', () => {
      const base = Point0.create('base').root()
      const layout1 = base.lets('layout', 'layout1', '/layout1').layout(PC).point
      const layout2 = layout1.lets('layout', 'layout2', '/layout2').layout(PC).point
      const points = PointsManager.ready({
        _root_ready: base,
        one: base.lets('page', '1', '/1').page(PC).point,
        two: layout1.lets('page', '2', '/2').page(PC).point,
        three: layout2.lets('page', '3', '/3').page(PC).point,
      })
      const pagesTreeSource = PointsManager.toPagesTreeSource({ points: points.collection })
      expect(pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['1'],
          nested: undefined,
        },
        {
          layout: 'layout1',
          pages: ['2'],
          nested: [
            {
              layout: 'layout2',
              pages: ['3'],
              nested: undefined,
            },
          ],
        },
      ])
    })

    it('two layouts two pages', () => {
      const base = Point0.create('base').root()
      const layout1 = base.lets('layout', 'layout1', '/layout1').layout(PC).point
      const layout2 = layout1.lets('layout', 'layout2', '/layout2').layout(PC).point
      const points = PointsManager.ready({
        _root_ready: base,
        zero: base.lets('page', '0', '/0').page(PC).point,
        one: base.lets('page', '1', '/1').page(PC).point,
        two: layout1.lets('page', '2', '/2').page(PC).point,
        three: layout1.lets('page', '3', '/3').page(PC).point,
        four: layout2.lets('page', '4', '/4').page(PC).point,
        five: layout2.lets('page', '5', '/5').page(PC).point,
      })
      const pagesTreeSource = PointsManager.toPagesTreeSource({ points: points.collection })
      expect(pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['0', '1'],
          nested: undefined,
        },
        {
          layout: 'layout1',
          pages: ['2', '3'],
          nested: [
            {
              layout: 'layout2',
              pages: ['4', '5'],
              nested: undefined,
            },
          ],
        },
      ])
    })
  })
})

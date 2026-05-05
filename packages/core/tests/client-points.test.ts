import { describe, expect, it } from 'bun:test'
import React from 'react'
import { ClientPoints } from '../src/client-points.js'
import { Point0 } from '../src/point0.js'

const getFC = () => () => React.createElement('div', { children: 'X' })

describe('ClientPoints', () => {
  describe('pagesTree', () => {
    it('no layout pages', () => {
      const base = Point0.lets('root', 'base').root()
      const points = ClientPoints.createFromDefintion([
        base,
        base.lets('page', '1', '/1').page(getFC()),
        base.lets('page', '2', '/2').page(getFC()),
      ])
      const pagesTreeSource = ClientPoints.toPagesTreeSource({ points: points.manager.collection })
      expect(pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['1', '2'],
          nested: undefined,
        },
      ])
    })

    it('one layout page', () => {
      const base = Point0.lets('root', 'base').root()
      const layout = base.lets('layout', 'layout', '/layout').layout(getFC()).point
      const points = ClientPoints.createFromDefintion([
        base,
        base.lets('page', '1', '/1').page(getFC()),
        layout.lets('page', '2', '/2').page(getFC()),
      ])
      const pagesTreeSource = ClientPoints.toPagesTreeSource({ points: points.manager.collection })
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
      const base = Point0.lets('root', 'base').root()
      const layout1 = base.lets('layout', 'layout1', '/layout1').layout(getFC()).point
      const layout2 = layout1.lets('layout', 'layout2', '/layout2').layout(getFC()).point
      const points = ClientPoints.createFromDefintion([
        base,
        base.lets('page', '1', '/1').page(getFC()),
        layout1.lets('page', '2', '/2').page(getFC()),
        layout2.lets('page', '3', '/3').page(getFC()),
      ])
      const pagesTreeSource = ClientPoints.toPagesTreeSource({ points: points.manager.collection })
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
      const base = Point0.lets('root', 'base').root()
      const layout1 = base.lets('layout', 'layout1', '/layout1').layout(getFC())
      const layout2 = layout1.lets('layout', 'layout2', '/layout2').layout(getFC())
      const points = ClientPoints.createFromDefintion([
        base,
        base.lets('page', '0', '/0').page(getFC()),
        base.lets('page', '1', '/1').page(getFC()),
        layout1.lets('page', '2', '/2').page(getFC()),
        layout1.lets('page', '3', '/3').page(getFC()),
        layout2.lets('page', '4', '/4').page(getFC()),
        layout2.lets('page', '5', '/5').page(getFC()),
      ])
      const pagesTreeSource = ClientPoints.toPagesTreeSource({ points: points.manager.collection })
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

    it('layout route regex includes nested pages', () => {
      const base = Point0.lets('root', 'base').root()
      const layout1 = base.lets('layout', 'layout1', '/layout1').layout(getFC())
      const layout2 = layout1.lets('layout', 'layout2', '/layout2').layout(getFC())
      const points = ClientPoints.createFromDefintion([
        base,
        layout1.lets('page', 'layout-page', '/layout-page').page(getFC()),
        layout2.lets('page', 'nested-page', '/nested-page').page(getFC()),
      ])

      const layoutRecord = points.pagesTree[0]

      expect(layoutRecord.pagesRoutesRegex.test('/layout1/layout-page')).toBe(true)
      expect(layoutRecord.pagesRoutesRegex.test('/layout1/layout2/nested-page')).toBe(true)
    })
  })
})

import { describe, expect, it } from 'bun:test'
import React from 'react'
import { Point0 } from './index.js'
import { Points } from './points.js'

// TODO: move all tests to separate files in test dir and refactor it

const PC = () => React.createElement('div', { children: 'X' })

describe('points', () => {
  describe('pagesTree', () => {
    it('no layout pages', () => {
      const base = Point0.source('base')
      const points = Points.ready([
        base.lets('page', '1').route('/1').page(PC),
        base.lets('page', '2').route('/2').page(PC),
      ])
      expect(points._.pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['1', '2'],
          nested: undefined,
        },
      ])
    })

    it('one layout page', () => {
      const base = Point0.source('base')
      const layout = base.lets('layout', 'layout').route('/layout').layout(PC)
      const points = Points.ready([
        base.lets('page', '1').route('/1').page(PC),
        layout.lets('page', '2').route('/2').page(PC),
      ])
      expect(points._.pagesTreeSource).toEqual([
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
      const base = Point0.source('base')
      const layout1 = base.lets('layout', 'layout1').route('/layout1').layout(PC)
      const layout2 = layout1.lets('layout', 'layout2').route('/layout2').layout(PC)
      const points = Points.ready([
        base.lets('page', '1').route('/1').page(PC),
        layout1.lets('page', '2').route('/2').page(PC),
        layout2.lets('page', '3').route('/3').page(PC),
      ])
      expect(points._.pagesTreeSource).toEqual([
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
      const base = Point0.source('base')
      const layout1 = base.lets('layout', 'layout1').route('/layout1').layout(PC)
      const layout2 = layout1.lets('layout', 'layout2').route('/layout2').layout(PC)
      const points = Points.ready([
        base.lets('page', '0').route('/0').page(PC),
        base.lets('page', '1').route('/1').page(PC),
        layout1.lets('page', '2').route('/2').page(PC),
        layout1.lets('page', '3').route('/3').page(PC),
        layout2.lets('page', '4').route('/4').page(PC),
        layout2.lets('page', '5').route('/5').page(PC),
      ])
      expect(points._.pagesTreeSource).toEqual([
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

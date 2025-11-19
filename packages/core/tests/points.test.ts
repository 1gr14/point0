import { describe, expect, it } from 'bun:test'
import React from 'react'
import { Point0 } from '../src/index.js'
import { Points } from '../src/points.js'

// TODO: move all tests to separate files in test dir and refactor it

const PC = () => React.createElement('div', { children: 'X' })

describe('points', () => {
  describe('pagesTree', () => {
    it('no layout pages', () => {
      const base = Point0.source('base').base()
      const points = Points.ready({
        root: base,
        one: base.lets('page', '1').route('/1').page(PC).point,
        two: base.lets('page', '2').route('/2').page(PC).point,
      })
      const pagesTreeSource = Points.toPagesTreeSource({ points: points.collection })
      expect(pagesTreeSource).toEqual([
        {
          layout: undefined,
          pages: ['1', '2'],
          nested: undefined,
        },
      ])
    })

    it('one layout page', () => {
      const base = Point0.source('base').base()
      const layout = base.lets('layout', 'layout').route('/layout').layout(PC).point
      const points = Points.ready({
        root: base,
        one: base.lets('page', '1').route('/1').page(PC).point,
        two: layout.lets('page', '2').route('/2').page(PC).point,
      })
      const pagesTreeSource = Points.toPagesTreeSource({ points: points.collection })
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
      const base = Point0.source('base').base()
      const layout1 = base.lets('layout', 'layout1').route('/layout1').layout(PC).point
      const layout2 = layout1.lets('layout', 'layout2').route('/layout2').layout(PC).point
      const points = Points.ready({
        root: base,
        one: base.lets('page', '1').route('/1').page(PC).point,
        two: layout1.lets('page', '2').route('/2').page(PC).point,
        three: layout2.lets('page', '3').route('/3').page(PC).point,
      })
      const pagesTreeSource = Points.toPagesTreeSource({ points: points.collection })
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
      const base = Point0.source('base').base()
      const layout1 = base.lets('layout', 'layout1').route('/layout1').layout(PC).point
      const layout2 = layout1.lets('layout', 'layout2').route('/layout2').layout(PC).point
      const points = Points.ready({
        root: base,
        zero: base.lets('page', '0').route('/0').page(PC).point,
        one: base.lets('page', '1').route('/1').page(PC).point,
        two: layout1.lets('page', '2').route('/2').page(PC).point,
        three: layout1.lets('page', '3').route('/3').page(PC).point,
        four: layout2.lets('page', '4').route('/4').page(PC).point,
        five: layout2.lets('page', '5').route('/5').page(PC).point,
      })
      const pagesTreeSource = Points.toPagesTreeSource({ points: points.collection })
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

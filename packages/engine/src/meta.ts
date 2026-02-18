import type { ReadyPointType, PointName, PointsScope } from '@point0/core'

export type MetaItemPoint = {
  what: 'point'
  path: string
  line: number
  column: number
  side: 'client' | 'server'
  scope: PointsScope
  type: ReadyPointType
  name: PointName
  routeName: string | undefined
  routePath: string | undefined
}

export type MetaItemFile = {
  what: 'file'
  path: string
  scope: string
  side: 'client' | 'server'
  type: 'points' | 'routes' | 'entry' | 'engine'
}

export type MetaItem = MetaItemPoint | MetaItemFile

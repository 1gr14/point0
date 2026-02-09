import type { EndPointType, PointName, PointsScope } from '@point0/core'

export type MetaItemPoint = {
  what: 'point'
  path: string
  line: number
  column: number
  target: 'client' | 'server'
  scope: PointsScope
  type: EndPointType
  name: PointName
  routeName: string | undefined
  routePath: string | undefined
}

export type MetaItemFile = {
  what: 'file'
  path: string
  scope: string
  target: 'client' | 'server'
  type: 'points' | 'routes' | 'entry' | 'engine'
}

export type MetaItem = MetaItemPoint | MetaItemFile

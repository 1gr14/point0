import type { AnyRoute } from '@devp0nt/route0'
import type { CompilerPointParsedPos } from '@point0/compiler'
import type { AnyNiceReadyPoint, PointName, PointsScope, ReadyPointType } from '@point0/core'

export type AnalyzerMetaPointShort = {
  scope: PointsScope | undefined
  type: ReadyPointType
  name: PointName
  id: string
  pos: CompilerPointParsedPos | undefined
}

export type AnalyzerMetaPoint = {
  scope: PointsScope | undefined
  type: ReadyPointType
  name: PointName
  id: string
  route: AnyRoute | undefined
  endpoint: { method: string; route: AnyRoute } | undefined
  pos: CompilerPointParsedPos | undefined
  import: (() => Promise<AnyNiceReadyPoint>) | undefined
  valid: boolean
  errors: string[]
  ssr: boolean
  parents: AnalyzerMetaPointShort[]
  layouts: AnalyzerMetaPointShort[]
}

const pickFields = (point: AnalyzerMetaPoint, fields: AnalyzerMetaPointFields[]): Partial<AnalyzerMetaPoint> => {
  return fields.reduce((acc, field) => {
    acc[field] = point[field] as never
    return acc
  }, {} as Partial<AnalyzerMetaPoint>)
}

export type AnalyzerMetaPointFields =
  | 'id'
  | 'scope'
  | 'type'
  | 'name'
  | 'route'
  | 'endpoint'
  | 'pos'
  | 'import'
  | 'valid'
  | 'errors'
  | 'ssr'
  | 'parents'
  | 'layouts'

export type AnalyzerMeta = {
  scopes: PointsScope[]
  points: AnalyzerMetaPoint[]
}

export type AnalyzerMetaSource = AnalyzerMeta | (() => Promise<AnalyzerMeta> | AnalyzerMeta)

export type AnalyzerPointsFilterOptions = {
  id?: string
  scope?: PointsScope
  type?: ReadyPointType
  name?: PointName
  route?: string
  url?: string
  endpointMethod?: string
  endpointRoute?: string
  endpointUrl?: string
  valid?: boolean
  ssr?: boolean
  file?: string
  parendId?: string
  layoutId?: string
}

export class Analyzer {
  meta: AnalyzerMeta

  private constructor({ meta }: { meta: AnalyzerMeta }) {
    this.meta = meta
  }

  static create({ meta }: { meta: AnalyzerMeta }): Analyzer {
    return new Analyzer({ meta })
  }

  static async load({ source }: { source: AnalyzerMetaSource }): Promise<Analyzer> {
    if (typeof source === 'function') {
      const meta = await source()
      return Analyzer.create({ meta })
    }
    return Analyzer.create({ meta: source })
  }

  findPoints<TFields extends AnalyzerMetaPointFields | undefined = undefined>({
    filter,
    limit = 100,
    offset = 0,
    fields,
  }: {
    filter?: AnalyzerPointsFilterOptions
    limit?: number
    offset?: number
    fields?: TFields[]
  }): TFields extends AnalyzerMetaPointFields ? Array<Pick<AnalyzerMetaPoint, TFields>> : AnalyzerMetaPoint[] {
    const filtered = !filter
      ? this.meta.points
      : this.meta.points.filter((point) => {
          if (filter.id && point.id !== filter.id) {
            return false
          }
          if (filter.file && point.pos?.file !== filter.file) {
            return false
          }
          if (filter.scope && point.scope !== filter.scope) {
            return false
          }
          if (filter.type && point.type !== filter.type) {
            return false
          }
          if (filter.name && point.name !== filter.name) {
            return false
          }
          if (filter.route && point.route?.definition !== filter.route) {
            return false
          }
          if (filter.url) {
            if (!point.route) {
              return false
            }
            const relation = point.route.getRelation(filter.url)
            if (!relation.exact) {
              return false
            }
          }
          if (filter.endpointMethod && point.endpoint?.method !== filter.endpointMethod) {
            return false
          }
          if (filter.endpointRoute && point.endpoint?.route.definition !== filter.endpointRoute) {
            return false
          }
          if (filter.endpointUrl) {
            if (!point.endpoint) {
              return false
            }
            const relation = point.endpoint.route.getRelation(filter.endpointUrl)
            if (!relation.exact) {
              return false
            }
          }
          if (filter.valid !== undefined && point.valid !== filter.valid) {
            return false
          }
          if (filter.ssr !== undefined && point.ssr !== filter.ssr) {
            return false
          }
          if (filter.parendId && point.parents.every((parent) => parent.id !== filter.parendId)) {
            return false
          }
          if (filter.layoutId && point.layouts.every((layout) => layout.id !== filter.layoutId)) {
            return false
          }
          return true
        })
    const cutted = filtered.slice(offset, offset + limit)
    const picked = !fields ? cutted : cutted.map((point) => pickFields(point, fields as never))
    return picked as never
  }

  getPoint<TFields extends AnalyzerMetaPointFields | undefined = undefined>({
    filter,
    fields,
  }: {
    filter?: AnalyzerPointsFilterOptions
    fields?: TFields[]
  }): TFields extends AnalyzerMetaPointFields
    ? Pick<AnalyzerMetaPoint, TFields> | undefined
    : AnalyzerMetaPoint | undefined {
    const points = this.findPoints({ filter, fields })
    return points[0] as never
  }
}

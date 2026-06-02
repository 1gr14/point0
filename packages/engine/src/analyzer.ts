import { stat } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { AnyRoute } from '@devp0nt/route0'
import type { CompilerPointParsedPos } from '@point0/compiler'
import type { AnyNiceReadyPoint, PointName, PointsScope, ReadyPointType } from '@point0/core'
import { z } from 'zod'
import type { Engine } from './engine.js'

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
  tags: string[]
  description: string | undefined
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

const omitFields = (obj: Record<string, unknown>, keys: string[]): Partial<Record<string, unknown>> => {
  return keys.reduce(
    (acc, key) => {
      delete acc[key]
      return acc
    },
    { ...obj },
  )
}

export const ANALYZER_META_POINT_FIELDS = [
  'id',
  'scope',
  'type',
  'name',
  'tags',
  'description',
  'route',
  'endpoint',
  'pos',
  // 'import',
  'valid',
  'errors',
  'ssr',
  'parents',
  'layouts',
] as const

export const analyzerMetaPointFieldsSchema = z.enum(ANALYZER_META_POINT_FIELDS)

export type AnalyzerMetaPointFields = z.infer<typeof analyzerMetaPointFieldsSchema>

export type AnalyzerMetaEngine = {
  file: string
  import: () => Promise<Engine>
  server:
    | {
        scope: PointsScope
      }
    | undefined
  clients:
    | Array<{
        scope: PointsScope
      }>
    | undefined
}

export type AnalyzerMeta = {
  engine: AnalyzerMetaEngine
  points: AnalyzerMetaPoint[]
}

export type AnalyzerMetaSource = AnalyzerMeta | string | (() => Promise<AnalyzerMeta> | AnalyzerMeta)

export const analyzerPointsFilterSchemaShape = {
  ids: z.array(z.string()).optional().describe('Exact point ids match.'),
  id: z.string().optional().describe('Exact point id match.'),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe('Filter by tags: string (any match) or string[] (all required).'),
  scope: z.string().optional().describe('Exact point scope match.'),
  type: z.string().optional().describe('Exact point type match.'),
  name: z.string().optional().describe('Exact point name match.'),
  route: z.string().optional().describe('Exact point route definition match.'),
  url: z
    .string()
    .optional()
    .describe('Exact URL (full or just path) match against point.route using analyzer route matching.'),
  endpointMethod: z.string().optional().describe('Exact endpoint HTTP method match.'),
  endpointRoute: z.string().optional().describe('Exact endpoint route definition match.'),
  endpointUrl: z
    .string()
    .optional()
    .describe('Exact URL (full or just path) match against endpoint.route using analyzer route matching.'),
  valid: z.boolean().optional().describe('Filter by point validity.'),
  ssr: z.boolean().optional().describe('Filter by SSR flag.'),
  file: z.string().optional().describe('Exact source file path match from point.pos.file.'),
  parendId: z.string().optional().describe("Filter by parent id. Kept with analyzer's current property spelling."),
  layoutId: z.string().optional().describe('Filter by layout id.'),
}

export const analyzerPointsFilterOptionsSchema = z.object(analyzerPointsFilterSchemaShape)

export const analyzerPointSelectSchemaShape = {
  ...analyzerPointsFilterSchemaShape,
  fields: z.array(analyzerMetaPointFieldsSchema).optional().describe('Optional list of fields to return.'),
}

export const analyzerPointSelectOptionsSchema = z.object(analyzerPointSelectSchemaShape)

export const analyzerListPointsSchemaShape = {
  ...analyzerPointSelectSchemaShape,
  limit: z.number().int().nonnegative().optional().describe('Maximum number of points to return. Default 100.'),
  offset: z.number().int().nonnegative().optional().describe('Zero-based pagination offset. Default 0.'),
}

export const analyzerListPointsOptionsSchema = z.object(analyzerListPointsSchemaShape)

export type AnalyzerPointsFilterOptions = z.infer<typeof analyzerPointsFilterOptionsSchema>

export type AnalyzerPointSelectOptions = z.infer<typeof analyzerPointSelectOptionsSchema>

export type AnalyzerListPointsOptions = z.infer<typeof analyzerListPointsOptionsSchema>

export class Analyzer {
  metas: AnalyzerMeta[]
  engines: AnalyzerMetaEngine[]
  points: AnalyzerMetaPoint[]

  private constructor({ metas }: { metas: AnalyzerMeta[] }) {
    this.metas = metas
    this.engines = metas.map((meta) => meta.engine)
    this.points = metas.flatMap((meta) => meta.points)
  }

  static create(meta: AnalyzerMeta | AnalyzerMeta[]): Analyzer {
    const metas = Array.isArray(meta) ? meta : [meta]
    if (metas.length === 0) {
      throw new Error('No metas provided')
    }
    return new Analyzer({ metas })
  }

  static async load(source: AnalyzerMetaSource | AnalyzerMetaSource[]): Promise<Analyzer> {
    const sources = Array.isArray(source) ? source : [source]
    if (sources.length === 0) {
      throw new Error('No sources provided')
    }
    const meta = await Promise.all(
      sources.map(async (source) => {
        if (typeof source === 'function') {
          return await source()
        }
        if (typeof source === 'string') {
          const imported = await import(/* @preserve */ /* @vite-ignore */ source)
          if (imported.default) {
            return imported.default
          }
          return imported
        }
        return source
      }),
    )
    return Analyzer.create(meta)
  }

  listPoints<TFields extends AnalyzerMetaPointFields | undefined = undefined>({
    filter,
    limit = 100,
    offset = 0,
    fields,
    omitImports,
  }: {
    filter?: AnalyzerPointsFilterOptions
    limit?: number
    offset?: number
    fields?: TFields[]
    omitImports?: boolean
  } = {}): {
    points: TFields extends AnalyzerMetaPointFields ? Array<Pick<AnalyzerMetaPoint, TFields>> : AnalyzerMetaPoint[]
    total: number
    hasMore: boolean
    nextOffset: number | undefined
  } {
    const filtered = !filter
      ? this.points
      : this.points.filter((point) => {
          if (filter.id && point.id !== filter.id) {
            return false
          }
          if (filter.ids && !filter.ids.includes(point.id)) {
            return false
          }
          if (filter.tags) {
            const hasTags =
              typeof filter.tags === 'string'
                ? point.tags.some((tag) => tag === filter.tags)
                : filter.tags.every((tag) => point.tags.includes(tag))
            if (!hasTags) {
              return false
            }
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
    const omited = omitImports ? picked.map((point) => omitFields(point, ['import'])) : picked
    const total = filtered.length
    const hasMore = total > offset + limit
    const nextOffset = hasMore ? offset + limit : undefined
    return { points: omited as never, total, hasMore, nextOffset }
  }

  getPoint<TFields extends AnalyzerMetaPointFields | undefined = undefined>({
    filter,
    fields,
    omitImports,
  }: {
    filter: AnalyzerPointsFilterOptions
    fields?: TFields[]
    omitImports?: boolean
  }): TFields extends AnalyzerMetaPointFields
    ? Pick<AnalyzerMetaPoint, TFields> | undefined
    : AnalyzerMetaPoint | undefined {
    const { points } = this.listPoints({ filter, fields, omitImports })
    return points[0] as never
  }
}

/** Pick only the filter keys out of a select/list options object (drops `fields`, `limit`, `offset`). */
export const buildPointsFilter = (input: AnalyzerPointSelectOptions): AnalyzerPointsFilterOptions => {
  return {
    ids: input.ids,
    id: input.id,
    tags: input.tags,
    scope: input.scope,
    type: input.type,
    name: input.name,
    route: input.route,
    url: input.url,
    endpointMethod: input.endpointMethod,
    endpointRoute: input.endpointRoute,
    endpointUrl: input.endpointUrl,
    valid: input.valid,
    ssr: input.ssr,
    file: input.file,
    parendId: input.parendId,
    layoutId: input.layoutId,
  }
}

/** Require at least one `--meta` path, mirroring the CLI/MCP contract. */
export const ensureMetaPaths = (metaPaths: string[] | undefined): string[] => {
  if (!metaPaths || metaPaths.length === 0) {
    throw new Error("At least one '--meta <path>' flag is required.")
  }
  return metaPaths
}

/** Resolve meta paths (relative to cwd) into importable `file://` URLs. */
export const resolveMetaImportPaths = (metaPaths: string[]): string[] => {
  return ensureMetaPaths(metaPaths).map((metaPath) => {
    const absolutePath = path.isAbsolute(metaPath) ? metaPath : path.resolve(process.cwd(), metaPath)
    return pathToFileURL(absolutePath).href
  })
}

/**
 * Build a loader that always reflects the on-disk meta. MCP servers are long-lived, so an
 * analyzer loaded once would keep serving stale points after `point0 generate` rewrites the
 * meta. On each call we stat the meta files; when any `mtime` changed we re-import with a
 * `?v=<mtime>` cache-buster — ESM caches modules by URL, so re-importing the same href would
 * otherwise be a no-op and the new points would never load. Unchanged metas hit the ESM module
 * cache and the rebuild is effectively free.
 */
export const createMetaAnalyzerLoader = (metaPaths: string[]): (() => Promise<Analyzer>) => {
  const absolutePaths = ensureMetaPaths(metaPaths).map((metaPath) =>
    path.isAbsolute(metaPath) ? metaPath : path.resolve(process.cwd(), metaPath),
  )
  let cached: { key: string; analyzer: Analyzer } | undefined
  return async () => {
    const mtimes = await Promise.all(absolutePaths.map(async (absolutePath) => (await stat(absolutePath)).mtimeMs))
    const key = mtimes.join('|')
    if (cached?.key === key) {
      return cached.analyzer
    }
    const urls = absolutePaths.map((absolutePath, index) => `${pathToFileURL(absolutePath).href}?v=${mtimes[index]}`)
    const analyzer = await Analyzer.load(urls)
    cached = { key, analyzer }
    return analyzer
  }
}

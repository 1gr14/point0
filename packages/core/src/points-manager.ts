import { Route0 } from '@devp0nt/route0'
import type { AnyRoute } from '@devp0nt/route0'
import * as React from 'react'
import type { ErrorPoint0 } from './error.js'
import type {
  PointName,
  PointsScope,
  ReadyPoint,
  ReadyPointType,
  RequiredCtx,
  RootPoint,
  UndefinedRoute,
} from './types.js'

export class PointsManager<
  TReady extends boolean = boolean,
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> {
  collection: TReady extends true ? ReadyPointsCollection : NormalizedPointsCollection
  root: RootPoint
  scope: PointsScope
  ready: TReady

  Infer: {
    RequiredCtx: TRequiredCtx
  } = {} as never

  private constructor({
    collection,
    ready,
    root,
    scope,
  }: {
    collection: TReady extends true ? ReadyPointsCollection : NormalizedPointsCollection
    ready: boolean
    root: RootPoint
    scope: PointsScope
  }) {
    this.ready = ready as TReady
    this.collection = collection
    this.root = root
    this.scope = scope
  }

  static readonly createFromDefinition = <TPoints extends PointsDefinition<any, any> | PointsManager<any, any, any>>(
    points: TPoints,
  ): PointsManager<
    false,
    TPoints extends PointsManager<any, infer TRequiredCtx, any>
      ? TRequiredCtx
      : TPoints extends PointsDefinition<infer TRequiredCtx, any>
        ? TRequiredCtx
        : RequiredCtx,
    TPoints extends PointsDefinition<any, infer TError>
      ? TError
      : TPoints extends PointsManager<any, any, infer TError>
        ? TError
        : ErrorPoint0
  > => {
    if (points instanceof PointsManager) {
      return points as never
    }
    const collection = PointsManager.toNormalizedPointsCollection(points)
    return PointsManager.createFromCollection(collection) as never
  }

  private static recordToString = (record: NormalizedPointsCollectionRecord, scope?: PointsScope) => {
    return [scope, record.type, record.name].filter((s) => s !== undefined).join('.')
  }

  private static readonly notifyAboutDuplicates = (collection: NormalizedPointsCollection, scope?: PointsScope) => {
    const checks: Array<{ first: (typeof collection)[number]; duplicates: Array<(typeof collection)[number]> }> = []
    for (const record of collection) {
      const check = checks.find((d) => d.first.name === record.name && d.first.type === record.type)
      if (!check) {
        checks.push({ first: record, duplicates: [] })
      } else {
        check.duplicates.push(record)
      }
    }
    const duplicates = checks.filter((c) => c.duplicates.length > 0).map((c) => [c.first, ...c.duplicates])
    // for (const duplicateCheck of duplicatesChecks) {
    //   console.error(
    //     `Duplicate points found: ${[duplicateCheck.first, ...duplicateCheck.duplicates].map((r) => PointsManager.recordToString(r)).join(', ')}`,
    //   )
    // }
    if (duplicates.length > 0) {
      throw new Error(
        'Duplicate points found:\n' +
          duplicates.map((c) => c.map((r) => PointsManager.recordToString(r, scope)).join(', ')).join('\n'),
      )
    }
  }

  static readonly createFromCollection = (
    collection: NormalizedPointsCollection,
  ): PointsManager<false, RequiredCtx> => {
    const firstRecord = collection.at(0)
    if (!PointsManager.isRootRecord(firstRecord)) {
      throw new Error('Root point not found')
    }
    const root = firstRecord.point as RootPoint
    PointsManager.notifyAboutDuplicates(collection, root.scope)
    return new PointsManager({
      root,
      scope: root.scope,
      collection,
      ready: false,
    })
  }

  static async createFromSource<TSource extends PointsDefinitionSource<any, any>>(
    source: TSource,
  ): Promise<
    PointsManager<
      false,
      TSource extends PointsDefinitionSource<infer TRequiredCtx> ? TRequiredCtx : never,
      TSource extends PointsDefinitionSource<any, infer TError> ? TError : ErrorPoint0
    >
  > {
    if (typeof source === 'function') {
      const result = await source()
      const points = 'default' in result ? result.default : result
      return PointsManager.createFromDefinition(points) as never
    }
    if ('default' in source) {
      const points = source.default
      return PointsManager.createFromDefinition(points) as never
    }
    return PointsManager.createFromDefinition(source) as never
  }

  private static isRootRecord(
    record: NormalizedPointsCollectionRecord | undefined,
  ): record is NormalizedPointsCollectionRecord {
    return typeof record === 'object' && 'type' in record && record.type === 'root' && 'point' in record.point
  }

  async load(force?: boolean): Promise<PointsManager<true, TRequiredCtx, TError>> {
    if (this.ready && !force) {
      return this as PointsManager<true, TRequiredCtx, TError>
    }
    const { readyPoints, errors } = await PointsManager.toReadyPointsCollection(this.collection)
    for (const error of errors) {
      console.error(error)
    }
    this.collection = readyPoints
    this.ready = true as never
    this.root = this.collection.at(0)?.point as RootPoint
    this.scope = this.root.scope
    return this as PointsManager<true, TRequiredCtx, TError>
    // return new PointsManager<true, TRequiredCtx>({
    //   root: this.root,
    //   scope: this.root.scope,
    //   collection: readyPoints,
    //   ready: true,
    // })
  }

  static toNormalizedPointsCollection(points: MixedPointsCollection | PointsDefinition): NormalizedPointsCollection {
    return points.map((p) => {
      // const sourcePoint = record.point
      const point = 'point' in p && 'point' in p.point ? p.point.point : undefined
      const record = 'type' in p && !('point' in p && 'point' in p.point) ? p : undefined
      const source = point ?? (record as Exclude<typeof record, undefined>)
      const pointSource = point ?? source.point
      return {
        type: source.type,
        name: source.name,
        route: source.route ? Route0.from(source.route) : undefined,
        polh: !!source.polh,
        point: point ?? source.point,
        layouts: record ? (record.layouts ?? []) : point ? point._layouts.map((l) => l.name) : [],
        FC:
          source.type === 'layout'
            ? typeof pointSource === 'function'
              ? React.lazy(async () => ({
                  default: await pointSource().then((p) => p.point.Layout),
                }))
              : pointSource.point.Layout
            : source.type === 'page'
              ? typeof pointSource === 'function'
                ? React.lazy(async () => ({
                    default: await pointSource().then((p) => p.point.Page),
                  }))
                : pointSource.point.Page
              : source.type === 'component'
                ? typeof pointSource === 'function'
                  ? React.lazy(async () => ({
                      default: await pointSource().then((p) => p.point.Component),
                    }))
                  : pointSource.point.Component
                : source.type === 'provider'
                  ? typeof pointSource === 'function'
                    ? React.lazy(async () => ({
                        default: await pointSource().then((p) => p.point.Provider),
                      }))
                    : pointSource.point.Provider
                  : undefined,
      }
    })
  }

  private static rawPointsCollectionToReadyPointsCollection(points: ReadyPoint[]): ReadyPointsCollection {
    return points.map((point) => {
      return {
        ready: true,
        type: point.type,
        name: point.name,
        route: point.route ? Route0.from(point.route) : undefined,
        polh: point.polh,
        point,
        layouts: point._layouts.map((l) => l.name),
        FC:
          point.type === 'layout'
            ? point.Layout
            : point.type === 'page'
              ? point.Page
              : point.type === 'component'
                ? point.Component
                : point.type === 'provider'
                  ? point.Provider
                  : undefined,
      }
    })
  }

  private static async toReadyPointsCollection(
    points: NormalizedPointsCollection | ReadyPointsCollection,
  ): Promise<{ readyPoints: ReadyPointsCollection; errors: unknown[] }> {
    const results = await Promise.allSettled(
      points.map(async (record) => {
        const pointPromise = typeof record.point === 'function' ? record.point() : record.point
        return (await pointPromise).point
      }),
    )
    const rawPoints = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
    const readyPoints = PointsManager.rawPointsCollectionToReadyPointsCollection(rawPoints)
    const errors = results.filter((r) => r.status === 'rejected').map((r) => r.reason)
    return { readyPoints, errors }
  }

  getRoots(): RootPoint[] {
    const roots: RootPoint[] = []
    for (const record of this.collection) {
      if (PointsManager.isRootRecord(record)) {
        roots.push(record.point as RootPoint)
      }
    }
    return roots
  }
}

export type ReadyPointsCollectionRecord = {
  ready: true
  type: ReadyPointType
  name: PointName
  route: AnyRoute | undefined
  polh: boolean | number
  point: ReadyPoint
  FC: React.ComponentType | undefined
  layouts?: string[]
}
export type ReadyPointsCollection = ReadyPointsCollectionRecord[]

export type LazyPointsCollectionRecord = {
  type: ReadyPointType
  name: PointName
  route?: string | undefined
  polh?: boolean | number
  point: (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint }
  layouts?: string[]
}
export type LazyPointsCollection = LazyPointsCollectionRecord[]
export type NormalizedLazyPointsCollectionRecord = {
  type: ReadyPointType
  name: PointName
  route: AnyRoute | UndefinedRoute
  point: (() => Promise<{ point: ReadyPoint }>) | { point: ReadyPoint }
  polh: boolean | number
  FC: React.LazyExoticComponent<React.ComponentType> | React.ComponentType | undefined
  layouts: string[]
}
export type NormalizedLazyPointsCollection = NormalizedLazyPointsCollectionRecord[]

export type RawPointsCollectionRecord = { point: ReadyPoint }

export type MixedPointsCollectionRecord =
  | ReadyPointsCollectionRecord
  | LazyPointsCollectionRecord
  | NormalizedLazyPointsCollectionRecord
  | RawPointsCollectionRecord
export type MixedPointsCollection = MixedPointsCollectionRecord[]

export type NormalizedPointsCollectionRecord = ReadyPointsCollectionRecord | NormalizedLazyPointsCollectionRecord
export type NormalizedPointsCollection = NormalizedPointsCollectionRecord[]

export type PointsDefinition<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> =
  | [{ point: RootPoint<TRequiredCtx, TError> }, ...MixedPointsCollectionRecord[]]
  | readonly [{ point: RootPoint<TRequiredCtx, TError> }, ...MixedPointsCollectionRecord[]]
export type PointsDefinitionGetter<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = () => Promise<PointsDefinition<TRequiredCtx, TError>>
export type PointsDefinitionModule<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = {
  default: PointsDefinition<TRequiredCtx, TError>
}
export type PointsDefinitionModuleGetter<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> = () => Promise<PointsDefinitionModule<TRequiredCtx, TError>>
export type PointsDefinitionSource<
  TRequiredCtx extends RequiredCtx = RequiredCtx,
  TError extends ErrorPoint0 = ErrorPoint0,
> =
  | PointsDefinition<TRequiredCtx, TError>
  | PointsDefinitionGetter<TRequiredCtx, TError>
  | PointsDefinitionModule<TRequiredCtx, TError>
  | PointsDefinitionModuleGetter<TRequiredCtx, TError>
export type ExtractPointsDefinition<T extends PointsDefinitionSource> = T extends PointsDefinition
  ? T
  : T extends PointsDefinitionModule
    ? T['default']
    : T extends PointsDefinitionModuleGetter
      ? Awaited<ReturnType<T>> extends PointsDefinition
        ? Awaited<ReturnType<T>>
        : Awaited<ReturnType<T>> extends PointsDefinitionModule
          ? Awaited<ReturnType<T>>['default']
          : never
      : never
export type RequiredCtxByPointsDefinitionSource<T extends PointsDefinitionSource> =
  ExtractPointsDefinition<T>[0]['point']['Infer']['RequiredCtx']
export type RequiredCtxByPointsDefinitionSourceOrUndefined<T extends PointsDefinitionSource | undefined> =
  T extends PointsDefinitionSource ? RequiredCtxByPointsDefinitionSource<T> : T extends undefined ? undefined : never

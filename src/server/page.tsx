import { Route0 } from '@devp0nt/route0'
import type {
  AnyClientPage0,
  InferClientPageCtxOutput,
  InferClientPageDataOutput,
  PagesCollection,
} from '../client/page.js'
import { ClientPage0 } from '../client/page.js'
import type {
  Ctx,
  CtxFn,
  Data,
  EmptyCtx,
  EmptyData,
  ExtendFnRecord,
  LoaderFn,
  Payload,
  RequiredCtx,
  UndefinedCtx,
} from '../shared/types.js'

export class ServerPage0<
  TCtxRequired extends RequiredCtx = UndefinedCtx,
  TCtxOutput extends Ctx = TCtxRequired extends UndefinedCtx ? EmptyCtx : TCtxRequired,
  TDataOutput extends Data = EmptyData,
> {
  _extendFns: ExtendFnRecord[]

  constructor() {
    this._extendFns = []
  }

  ctx<TNewCtxOutput extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewCtxOutput>,
  ): ServerPage0<TCtxRequired, TNewCtxOutput, TDataOutput> {
    const newServerPage0 = new ServerPage0<TCtxRequired, TNewCtxOutput, TDataOutput>()
    newServerPage0._extendFns.push(...this._extendFns, { type: 'ctx', fn: ctxFn as never })
    return newServerPage0
  }

  loader<TNewDataOutput extends Data = Data>(
    loaderFn: LoaderFn<TCtxOutput, TDataOutput, Route0.AnyRoute, TNewDataOutput>,
  ): ServerPage0<TCtxRequired, TCtxOutput, TNewDataOutput> {
    const newServerPage0 = new ServerPage0<TCtxRequired, TCtxOutput, TNewDataOutput>()
    newServerPage0._extendFns.push(...this._extendFns, { type: 'loader', fn: loaderFn as never })
    return newServerPage0
  }

  static async extract<
    TServerPage0 extends AnyServerPage0 | undefined = undefined,
    TClientPage0 extends
      | undefined
      | (TServerPage0 extends AnyServerPage0
          ? AnyClientPage0<TServerPage0> | undefined
          : AnyClientPage0 | undefined) = undefined,
  >({
    location,
    page0,
    page,
    requiredCtx,
  }: {
    location: Route0.Location
    page0?: TServerPage0
    page: TClientPage0
    // TODO: make it really required by types
    requiredCtx?: Ctx
  }): Promise<
    TClientPage0 extends AnyClientPage0
      ? { ctx: InferClientPageCtxOutput<TClientPage0>; data: InferClientPageDataOutput<TClientPage0> }
      : TServerPage0 extends AnyServerPage0
        ? { ctx: InferServerPageCtxOutput<TServerPage0>; data: InferServerPageDataOutput<TServerPage0> }
        : { ctx: EmptyCtx; data: EmptyData }
  > {
    let ctxOutput: Ctx = requiredCtx ?? {}
    let dataOutput: Data = {}
    const extendFns = [...(page0?._extendFns ?? []), ...(page?.getExtendFns() ?? [])]

    for (const extendFn of extendFns) {
      switch (extendFn.type) {
        case 'ctx':
          ctxOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
          break
        case 'loader':
          dataOutput = await extendFn.fn({ ctx: { ...ctxOutput }, data: { ...dataOutput }, location })
          break
        // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
        default:
          throw new Error(`Unknown extend function type: ${(extendFn as any).type}`)
      }
    }

    return { ctx: ctxOutput, data: dataOutput } as never
  }

  static async extractElement({
    requiredCtx,
    page0,
    page,
    ...restProps
  }: {
    page0?: AnyServerPage0
    requiredCtx?: Ctx | UndefinedCtx
    page?: AnyClientPage0 | undefined
  } & ({ routePath: string } | { location: Route0.Location })): Promise<{
    element: React.ReactElement
    status: number
    payload: Payload
    error: unknown
    location: Route0.Location
  }> {
    const location = 'location' in restProps ? restProps.location : Route0.getLocation(restProps.routePath)
    let data: Data = {}
    try {
      const runResult = await ServerPage0.extract({
        location,
        page0,
        page,
        requiredCtx,
      })
      data = runResult.data
      const payload = { location, data, meta: { title: 'Hello, world!' } }
      // TODO: add correct errornames, like no pacge compoentn, no end callback, etc
      const ClientPageComponent = page?.getComponent()
      const ServerPageComponent = undefined // serverPage0?.getComponent() TODO: combine them
      const PageComponent = ClientPageComponent ?? ServerPageComponent
      if (!PageComponent) {
        // TODO: use provided errors
        const element = <div>Page not found</div>
        return { element, payload, error: new Error(`Page not found: ${location.pathname}`), status: 404, location }
      }
      const element = <PageComponent data={data} location={location} />
      // TODO: use provided meta
      return { element, payload, error: undefined, status: 200, location }
    } catch (error) {
      // TODO: use provided errors
      const element = <div>Error: {(error as any).message}</div>
      const payload = { location, data, meta: { title: 'Error' } }
      return { element, payload, error, status: 500, location }
    }
  }

  static async extractSuitableElement({
    requiredCtx,
    page0,
    pages,
    ...restProps
  }: {
    page0?: AnyServerPage0
    requiredCtx?: Ctx | UndefinedCtx
    pages: PagesCollection
  } & ({ routePath: string } | { location: Route0.Location })): Promise<{
    element: React.ReactElement
    status: number
    payload: Payload
    error: unknown
    location: Route0.Location
    page: AnyClientPage0 | undefined
  }> {
    const { page, location } = await ClientPage0.getSuitable({ pages, ...restProps })
    const { element, payload, error, status } = await ServerPage0.extractElement({ page0, page, requiredCtx, location })
    return { element, payload, error, status, location, page }
  }
}

export type AnyServerPage0<
  TCtxRequired extends RequiredCtx = RequiredCtx,
  TCtxOutput extends Ctx = Ctx,
  TDataOutput extends Data = Data,
> = ServerPage0<TCtxRequired, TCtxOutput, TDataOutput>

export type WithRequiredCtx<TCtxRequired extends RequiredCtx, TRest> = TCtxRequired extends Ctx
  ? {
      requiredCtx: TCtxRequired
    } & TRest
  : { requiredCtx?: undefined } & TRest

export type InferServerPageCtxOutput<TServerPage0 extends AnyServerPage0> =
  TServerPage0 extends AnyServerPage0<any, infer TCtxOutput, any> ? TCtxOutput : never
export type InferServerPageDataOutput<TServerPage0 extends AnyServerPage0> =
  TServerPage0 extends AnyServerPage0<any, any, infer TDataOutput> ? TDataOutput : never

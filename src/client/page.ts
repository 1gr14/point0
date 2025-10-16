import { Route0 } from '@devp0nt/route0'
import type { AnyServerPage0, InferServerPageCtxOutput, InferServerPageDataOutput } from '../server/page.js'
import type { Ctx, CtxFn, Data, ExtendFnRecord, LoaderFn } from '../shared/types.js'

export class ClientPage0<
  TServerPage0 extends AnyServerPage0,
  TCtxOutput extends Ctx = InferServerPageCtxOutput<TServerPage0>,
  TDataOutput extends Data = InferServerPageDataOutput<TServerPage0>,
  TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
  TComponent extends
    | ClientPageComponent<TDataOutput, TAssignedRoute0>
    | UndefinedClientPageComponent = UndefinedClientPageComponent,
> {
  _extendFns: ExtendFnRecord[]
  _route: TAssignedRoute0
  _component: TComponent

  constructor() {
    this._extendFns = []
    this._route = undefined as TAssignedRoute0
    this._component = undefined as TComponent
  }

  // setters

  ctx<TNewCtxOutput extends Ctx = Ctx>(
    ctxFn: CtxFn<TCtxOutput, TDataOutput, CurrentRoute<TAssignedRoute0>, TNewCtxOutput>,
  ): ClientPage0<TServerPage0, TNewCtxOutput, TDataOutput, TAssignedRoute0, TComponent> {
    const newClientPage0 = new ClientPage0<TServerPage0, TNewCtxOutput, TDataOutput, TAssignedRoute0, TComponent>()
    newClientPage0._extendFns.push(...this._extendFns, { type: 'ctx', fn: ctxFn as never })
    newClientPage0._route = this._route
    return newClientPage0
  }

  loader<TNewDataOutput extends Data = Data>(
    loaderFn: LoaderFn<TCtxOutput, TDataOutput, CurrentRoute<TAssignedRoute0>, TNewDataOutput>,
  ): ClientPage0<
    TServerPage0,
    TCtxOutput,
    TNewDataOutput,
    TAssignedRoute0,
    ClientPageComponent<TNewDataOutput, TAssignedRoute0>
  > {
    const newClientPage0 = new ClientPage0<
      TServerPage0,
      TCtxOutput,
      TNewDataOutput,
      TAssignedRoute0,
      ClientPageComponent<TNewDataOutput, TAssignedRoute0>
    >()
    newClientPage0._extendFns.push(...this._extendFns, { type: 'loader', fn: loaderFn as never })
    newClientPage0._route = this._route
    return newClientPage0
  }

  route<TNewRoute0 extends Route0.AnyRoute>(
    route: TNewRoute0,
  ): ClientPage0<TServerPage0, TCtxOutput, TDataOutput, TNewRoute0, TComponent> {
    const newClientPage0 = new ClientPage0<TServerPage0, TCtxOutput, TDataOutput, TNewRoute0, TComponent>()
    newClientPage0._extendFns.push(...this._extendFns)
    newClientPage0._route = route
    return newClientPage0
  }

  component<TNewComponent extends ClientPageComponent<TDataOutput, TAssignedRoute0>>(
    component: TNewComponent,
  ): ClientPage0<TServerPage0, TCtxOutput, TDataOutput, TAssignedRoute0, TNewComponent> {
    const newClientPage0 = new ClientPage0<TServerPage0, TCtxOutput, TDataOutput, TAssignedRoute0, TNewComponent>()
    newClientPage0._extendFns.push(...this._extendFns)
    newClientPage0._route = this._route
    newClientPage0._component = component
    return newClientPage0
  }

  // getters

  getRoute(): TAssignedRoute0 {
    return this._route
  }

  getComponent(): TComponent {
    return this._component
  }

  getExtendFns(): ExtendFnRecord[] {
    return this._extendFns
  }

  // helpers
  static async _getSuitable({
    path,
    clientPages0,
  }: {
    path: string
    clientPages0: ClientPages0
  }): Promise<{ clientPage0: AnyClientPage0 | undefined; location: Route0.Location }> {
    const location = Route0.getLocation(path)
    for (const [route, clientPage0Getter] of clientPages0) {
      const match = Route0.getMatch(route, location)
      if (!match.exact) {
        continue
      }
      const clientPage0 = clientPage0Getter instanceof ClientPage0 ? clientPage0Getter : await clientPage0Getter()
      return { clientPage0, location: match.location }
    }
    return { clientPage0: undefined, location }
  }
}

// export type AnyClientPage0<
//   TServerPage0 extends AnyServerPage0 = AnyServerPage0,
//   TCtxOutput extends Ctx = Ctx,
//   TDataOutput extends Data = Data,
//   TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
//   TComponent extends ClientPageComponent<TDataOutput, TAssignedRoute0> = ClientPageComponent<
//     TDataOutput,
//     TAssignedRoute0
//   >,
// > = ClientPage0<TServerPage0, TCtxOutput, TDataOutput, TAssignedRoute0, TComponent>
export type AnyClientPage0 = ClientPage0<any, any, any, any, any>

export type ClientPageComponentProps<
  TDataOutput extends Data = Data,
  TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
> = { data: TDataOutput; location: Route0.Location<CurrentRoute<TAssignedRoute0>> }
export type ClientPageComponent<
  TDataOutput extends Data = Data,
  TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
> = React.ComponentType<ClientPageComponentProps<TDataOutput, TAssignedRoute0>>
export type UndefinedClientPageComponent = undefined
export type UndefinedRoute = undefined
export type CurrentRoute<TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute> =
  TAssignedRoute0 extends Route0.AnyRoute ? TAssignedRoute0 : Route0.AnyRoute

// TODO: add layouts here
export type ClientPageLayout = React.ComponentType<{ children: React.ReactNode }>
export type ClientPages0 = Array<
  [Route0.AnyRoute, AnyClientPage0 | (() => Promise<AnyClientPage0> | AnyClientPage0), ...ClientPageLayout[]]
>

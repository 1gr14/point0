// circular, inconvinient

// import type { Route0 } from '@devp0nt/route0'
// import type { Ctx, Data, ExtendFnRecord, CtxFn, LoaderFn, RequiredCtx, UndefinedCtx } from './types.js'

// export class Page0<
//   TServerPage0 extends AnyPage0,
//   TCtxRequired extends RequiredCtx = UndefinedCtx,
//   TCtxOutput extends Ctx = InferPageCtxOutput<TServerPage0>,
//   TDataOutput extends Data = InferPageDataOutput<TServerPage0>,
//   TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
//   TComponent extends PageComponent<TDataOutput, TAssignedRoute0> | UndefinedPageComponent = UndefinedPageComponent,
// > {
//   _extendFns: ExtendFnRecord[]
//   _route: TAssignedRoute0
//   _component: TComponent

//   constructor() {
//     this._extendFns = []
//     this._route = undefined as TAssignedRoute0
//     this._component = undefined as TComponent
//   }

//   // setters

//   ctx<TNewCtxOutput extends Ctx = Ctx>(
//     ctxFn: CtxFn<TCtxOutput, TDataOutput, CurrentRoute<TAssignedRoute0>, TNewCtxOutput>,
//   ): Page0<TServerPage0, TCtxRequired, TNewCtxOutput, TDataOutput, TAssignedRoute0, TComponent> {
//     const newPage0 = new Page0<TServerPage0, TCtxRequired, TNewCtxOutput, TDataOutput, TAssignedRoute0, TComponent>()
//     newPage0._extendFns.push(...this._extendFns, { type: 'ctx', fn: ctxFn as never })
//     newPage0._route = this._route
//     return newPage0
//   }

//   loader<TNewDataOutput extends Data = Data>(
//     loaderFn: LoaderFn<TCtxOutput, TDataOutput, CurrentRoute<TAssignedRoute0>, TNewDataOutput>,
//   ): Page0<
//     TServerPage0,
//     TCtxRequired,
//     TCtxOutput,
//     TNewDataOutput,
//     TAssignedRoute0,
//     PageComponent<TNewDataOutput, TAssignedRoute0>
//   > {
//     const newPage0 = new Page0<
//       TServerPage0,
//       TCtxRequired,
//       TCtxOutput,
//       TNewDataOutput,
//       TAssignedRoute0,
//       PageComponent<TNewDataOutput, TAssignedRoute0>
//     >()
//     newPage0._extendFns.push(...this._extendFns, { type: 'loader', fn: loaderFn as never })
//     newPage0._route = this._route
//     return newPage0
//   }

//   route<TNewRoute0 extends Route0.AnyRoute>(
//     route: TNewRoute0,
//   ): Page0<TServerPage0, TCtxRequired, TCtxOutput, TDataOutput, TNewRoute0, TComponent> {
//     const newPage0 = new Page0<TServerPage0, TCtxRequired, TCtxOutput, TDataOutput, TNewRoute0, TComponent>()
//     newPage0._extendFns.push(...this._extendFns)
//     newPage0._route = route
//     return newPage0
//   }

//   component<TNewComponent extends PageComponent<TDataOutput, TAssignedRoute0>>(
//     component: TNewComponent,
//   ): Page0<TServerPage0, TCtxRequired, TCtxOutput, TDataOutput, TAssignedRoute0, TNewComponent> {
//     const newPage0 = new Page0<TServerPage0, TCtxRequired, TCtxOutput, TDataOutput, TAssignedRoute0, TNewComponent>()
//     newPage0._extendFns.push(...this._extendFns)
//     newPage0._route = this._route
//     newPage0._component = component
//     return newPage0
//   }

//   // getters

//   getRoute(): TAssignedRoute0 {
//     return this._route
//   }

//   getComponent(): TComponent {
//     return this._component
//   }

//   getExtendFns(): ExtendFnRecord[] {
//     return this._extendFns
//   }
// }

// export type AnyPage0<
//   TServerPage0 extends AnyPage0 = Page0<TServerPage0, TCtxRequired, TCtxOutput, TDataOutput, TAssignedRoute0, TComponent>,
//   TCtxRequired extends RequiredCtx = RequiredCtx,
//   TCtxOutput extends Ctx = Ctx,
//   TDataOutput extends Data = Data,
//   TAssignedRoute0 extends Route0.AnyRoute = Route0.AnyRoute,
//   TComponent extends PageComponent<TDataOutput, TAssignedRoute0> = PageComponent<TDataOutput, TAssignedRoute0>,
// > = Page0<TServerPage0, TCtxRequired, TCtxOutput, TDataOutput, TAssignedRoute0, TComponent>

// export type PageComponentProps<
//   TDataOutput extends Data = Data,
//   TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute,
// > = { data: TDataOutput; location: Route0.Location<CurrentRoute<TAssignedRoute0>> }
// export type PageComponent<
//   TDataOutput extends Data = Data,
//   TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = Route0.AnyRoute | UndefinedRoute,
// > = React.ComponentType<PageComponentProps<TDataOutput, TAssignedRoute0>>
// export type UndefinedPageComponent = undefined
// export type UndefinedRoute = undefined
// export type CurrentRoute<TAssignedRoute0 extends Route0.AnyRoute | UndefinedRoute = UndefinedRoute> =
//   TAssignedRoute0 extends Route0.AnyRoute ? TAssignedRoute0 : Route0.AnyRoute

// export type InferPageCtxOutput<TPage0 extends AnyPage0> =
//   TPage0 extends AnyPage0<any, any, infer TCtxOutput, any, any, any> ? TCtxOutput : never
// export type InferPageDataOutput<TPage0 extends AnyPage0> =
//   TPage0 extends AnyPage0<any, any, any, infer TDataOutput, any, any> ? TDataOutput : never

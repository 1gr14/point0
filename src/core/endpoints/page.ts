// import type { Error0 } from '@devp0nt/error0'
// import type { Route0 } from '@devp0nt/route0'
// import type { MutationOptions, QueryKey, QueryOptions, UseQueryResult } from '@tanstack/react-query'
// import type { Point0 } from '../index.js'
// import type {
//   Ctx,
//   Data,
//   FetcherFn,
//   FetchOutput,
//   InferredRootSourcePoint,
//   Input,
//   InputSchema,
//   RequiredCtx,
//   ResponseOutput,
//   UndefinedData,
//   UndefinedInferredRootSourcePoint,
//   UndefinedInputSchema,
//   UndefinedResponseOutput,
//   UndefinedRoute,
// } from '../types.js'

// export class PageEndPoint<
//   TPointType extends 'page',
//   TConnectedSourceBasePoint extends InferredRootSourcePoint | UndefinedInferredRootSourcePoint,
//   TRequiredCtx extends RequiredCtx,
//   TCtx extends Ctx,
//   TData extends Data | UndefinedData,
//   TClientData extends Data | UndefinedData,
//   TRoute extends Route0.AnyRoute | UndefinedRoute,
//   TInputSchema extends InputSchema | UndefinedInputSchema,
//   TResponseOutput extends ResponseOutput | UndefinedResponseOutput,
// > {
//   point: Point0<
//     TPointType,
//     TConnectedSourceBasePoint,
//     TRequiredCtx,
//     TCtx,
//     TData,
//     TClientData,
//     TRoute,
//     TInputSchema,
//     TResponseOutput
//   >
//   fetch: TData extends Data ? FetcherFn<TRoute, TInputSchema, Promise<FetchOutput<TResponseOutput, TData>>> : never
//   getQueryKey: TData extends Data ? FetcherFn<TRoute, TInputSchema, QueryKey> : never
//   getQueryOptions: TData extends Data
//     ? FetcherFn<TRoute, TInputSchema, QueryOptions<FetchOutput<TResponseOutput, TData>, Error0>>
//     : never
//   useQuery: TData extends Data
//     ? FetcherFn<TRoute, TInputSchema, UseQueryResult<FetchOutput<TResponseOutput, TData>, Error0>>
//     : never

//   getMutationOptions: TData extends Data
//     ? () => MutationOptions<FetchOutput<TResponseOutput, TData>, Error0, Input<TRoute, TInputSchema>>
//     : never

//   constructor(
//     point: Point0<
//       TPointType,
//       TConnectedSourceBasePoint,
//       TRequiredCtx,
//       TCtx,
//       TData,
//       TClientData,
//       TRoute,
//       TInputSchema,
//       TResponseOutput
//     >,
//   ) {
//     this.point = point
//     this.fetch = this.point._fetch as never
//     this.getQueryKey = this.point._getQueryKey as never
//     this.getQueryOptions = this.point._getQueryOptions as never

//     this.getMutationOptions = this.point._getMutationOptions as never
//   }
// }

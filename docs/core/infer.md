---
index: 1400
title: Infer
description:
  typeof point.Infer.* — pull any type out of a point without writing it by
  hand.
---

Every point carries an `Infer` property whose only job is type extraction. You
never read it at runtime — you write `typeof somePoint.Infer.<Key>` and get the
input type, the data type, the route string, the component type, and more,
derived from the point itself. Change the point's schema or loader and these
types follow automatically.

```tsx
import { ideaViewQuery } from '@/queries/idea'

// the data the loader returns — no hand-written interface
type IdeaViewData = typeof ideaViewQuery.Infer.QueriedData // => { idea: Idea }

// the raw input the query expects
type IdeaViewInput = typeof ideaViewQuery.Infer.InputRaw // => { id: string }
```

`Infer` is on **every** point — pages, layouts, queries, mutations, actions,
roots, bases, plugins — and survives the whole builder chain, so a finalized
point still has it. It's free at runtime: `Infer` is initialized to `null`, so
it exists only in the type system.

> **GOTCHA — type position only.** `point.Infer` is `null` at runtime, so
> accessing any member (e.g. `point.Infer.QueriedData`) as a _value_ throws —
> read it only in type position. Always wrap it in `typeof`.

## The two you reach for most

Almost every real use is one of these.

**`InputRaw`** — the input a point accepts, pre-validation, with every input
source merged (the `.input`, plus `.params` / `.search` / `.body` where they
apply):

```tsx
const mutation = root.lets
  .mutation()
  .input(z.union([z.object({ id: z.string() }), z.object({ sn: z.number() })]))
  .loader(({ input }) => ({ input }))
  .mutation()

type Input = typeof mutation.Infer.InputRaw // => { id: string } | { sn: number }
```

Unions are preserved, and a later `.input` distributes across each member:

```tsx
// .input(union).input(z.object({ x: z.string() }))
// => { x: string; id: string } | { x: string; sn: number }
```

**`QueriedData`** — the data a [query](query) / [infinite-query](infinite-query)
produces, after react-query shapes it (an infinite query wraps it in
`InfiniteData<…>`). This is how you derive a row type from a list query in
production:

```tsx
export const listAccountsQuery = root.lets
  .query()
  .loader(async ({ request }) => ({
    accounts: await listUserAccounts(request),
  }))
  .query()

// drill into the data to get one item's type
export type AccountsItem = NonNullable<
  typeof listAccountsQuery.Infer.QueriedData.accounts
>[number]
```

## Typing a component against its point

`EdgeComponent` is the typed React component a mountable point expects, and
`EdgeProps` is the props that component receives. Pull the type out and write
the component to match — no manual prop interface:

```tsx
const page = root.lets
  .page('/:id')
  .loader(({ params }) => ({ x: params.id }))
  .page((props) => <Page {...props} />)

// `Page` is typed from the point: `data` is { x: string }, plus params/search/…
const Page: typeof page.Infer.EdgeComponent = ({ data }) => (
  <div>x={data.x}</div>
)
```

`EdgeComponent` / `EdgeProps` resolve per point kind (page, layout, component,
provider). On a point that has no component — a query, a mutation, an action —
`EdgeComponent` is `undefined` and `EdgeProps` is `never`.

The bracket form `typeof point.Infer['Key']` is the same as
`typeof point.Infer.Key`; use whichever reads better in a generic position.

## Schemas, params, search, body

Each input source exposes its schema and its raw / parsed shapes. "Raw" is the
schema's input (pre-validation); "parsed" is its output (post-validation) — they
differ when the schema coerces or transforms:

```tsx
type Params = typeof ideaPage.Infer.ParamsParsed // parsed route params
type Search = typeof ideaPage.Infer.SearchRaw //    raw query-string values
type Body = typeof uploadAction.Infer.BodyParsed // parsed request body
```

The same `*Schema` / `*Raw` / `*Parsed` triple exists for `Params`, `Search`,
`Body`, `Headers`, and `Cookies`. See [validation](validation) for which point
type uses which input source.

## RouteDefinition

`RouteDefinition` is the point's final route as a literal type — prefixes from
parent [bases](base) and [roots](root) already compounded in:

```tsx
const base = root.lets('base', 'base').basePath('/my/prefix').base()
const action = base.lets.action('POST', '/api/my-test/:id') /* … */
type Route = typeof action.Infer.RouteDefinition // => '/my/prefix/api/my-test/:id'
```

## A sibling: InferNavigation

Navigation has its own inference surface — but it is **not** `point.Infer`. It
comes from [`createNavigation(...)`](navigation) and types your `<Link>` / route
props against your route table:

```tsx
export const { Link, navigate, InferNavigation } = createNavigation({
  routes /* … */,
})

export type AppLinkProps = typeof InferNavigation.LinkProps //     embeddable Link props
export type AppNavLinkProps = typeof InferNavigation.NavLinkProps // + active-state classNames
export type AppRouteProps = typeof InferNavigation.RouteProps //    just { route, input }
```

Same runtime rule: type position only, never read its members as values. Full
details on [Navigation](navigation).

## Reference

### All Infer keys

Every key on `typeof point.Infer`, in source order. A key that has no matching
schema / loader / component on a given point yields its "empty" type (an empty
object, `undefined`, `never`, or `false`) rather than an error — so you can read
any key on any point.

| Key                                                   | Yields                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PointType`                                           | the point's literal kind: `'page'` \| `'query'` \| `'mutation'` \| `'action'` \| … |
| `LetsReadyPointType`                                  | the kind set via `.lets(…)` before finalizing, or `undefined`                      |
| `Error`                                               | the point's [error class](error-handling) (`ErrorPoint0` by default, or your own)  |
| `RequiredCtx`                                         | the context the point requires to run (rarely needed directly)                     |
| `Ctx`                                                 | the full accumulated context object                                                |
| `CtxExposed`                                          | the subset of `Ctx` exposed to the client                                          |
| `CtxExposedKeys`                                      | the key-union of exposed ctx fields                                                |
| `ServerLoaderOutput`                                  | raw return type of the server `.loader`                                            |
| `ClientLoaderOutput`                                  | raw return type of the `.clientLoader`                                             |
| `MapperOutput`                                        | output of the point's [`.mapper`](mapper)                                          |
| `RouteDefinition`                                     | the final route as a literal string                                                |
| `ServerInputSchema` / `ClientInputSchema`             | the server / client input schema                                                   |
| `IsInputOptional`                                     | `true` / `false` — is the merged input optional?                                   |
| `InputRaw`                                            | the merged **raw** (pre-validation) input                                          |
| `InputRawOrUndefined`                                 | `InputRaw`, but `undefined` when the input is empty                                |
| `InputRawOrUndefinedOrVoid`                           | as above, plus `void` — for omit-the-arg call sites                                |
| `ClientInputRaw` / `ClientInputParsed`                | raw / parsed client input                                                          |
| `IsClientInputOptional`                               | `true` / `false` — is client input optional?                                       |
| `ServerInputRaw` / `ServerInputParsed`                | merged raw / parsed server input                                                   |
| `IsServerInputOptional`                               | `true` / `false` — is server input optional?                                       |
| `ParamsSchema` / `ParamsRaw` / `ParamsParsed`         | route-params schema / raw / parsed                                                 |
| `SearchSchema` / `SearchRaw` / `SearchParsed`         | query-string schema / raw / parsed                                                 |
| `BodySchema` / `BodyRaw` / `BodyParsed`               | request-body schema / raw / parsed                                                 |
| `HeadersSchema` / `HeadersRaw` / `HeadersParsed`      | headers schema / raw / parsed                                                      |
| `CookiesSchema` / `CookiesRaw` / `CookiesParsed`      | cookies schema / raw / parsed                                                      |
| `OuterProps`                                          | props passed **into** the point's component from outside                           |
| `InnerProps`                                          | props available **inside** the component (accumulated)                             |
| `QueryResultType`                                     | `'query'` \| `'infiniteQuery'` \| `undefined` — the query flavor                   |
| `Queries`                                             | the point's declared sub-query definitions                                         |
| `UseQueryOptions`                                     | the options type the point's `useQuery` accepts                                    |
| `UseQueryResult`                                      | the result type of the point's `useQuery`                                          |
| `FetchServerOutput`                                   | the server-loader output if present, else `never`                                  |
| `FetchOutput`                                         | the loader output (whichever the point has, server or client)                      |
| `ServerQueryFiniteData` / `ClientQueryFiniteData`     | server / client finite-query data                                                  |
| `ServerQueryInfiniteData` / `ClientQueryInfiniteData` | server / client infinite-query data                                                |
| `QueriedFiniteData` / `QueriedInfiniteData`           | final finite / infinite data                                                       |
| `ServerQueryData` / `ClientQueryData`                 | server / client query data, shaped by result type                                  |
| `QueriedData`                                         | **the canonical data key** — final query data, react-query-shaped                  |
| `ServerExecuteResult`                                 | the full server-execution result (`{ ctx, data, response, redirect, error, … }`)   |
| `EdgeComponent`                                       | the typed success component for a mountable point, else `undefined`                |
| `EdgeProps`                                           | the props that success component receives, else `never`                            |

### Notes on the data family

For most data extraction, reach for **`QueriedData`** (the final, react-query
shaped data) or **`FetchOutput`** (the raw loader output). The `Server*` /
`Client*` variants name the output of whichever loader the point uses — a point
has exactly one, server or client, never both — and the `*FiniteData` /
`*InfiniteData` split distinguishes finite from infinite shaping; you rarely
need them directly.

There is no `Location` key on `point.Infer` — location types belong to
[Navigation](navigation) (`InferNavigation`), not to the point.

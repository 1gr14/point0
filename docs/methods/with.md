---
index: 600
title: .with
description:
  One method to inject queries, manage loading and error, pass props, and wrap
  the render — the builder's swiss-army knife.
---

`.with` is the point builder's real swiss-army knife. With it you inject a
query, drive the loading and error states by hand, pass computed props down the
chain, or wrap the render. It's available on every [mountable](mountable) point
— [root](root), [base](base), [plugin](plugin), [page](page), [layout](layout),
[component](component), and [provider](provider) — but **not** on a
[mutation](mutation) or a standalone [query](query).

You've already seen the simple shape: inject a query, map the route into its
input, and read the loaded data in `.page`:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea } }) => <h1>{idea.title}</h1>)
```

The page renders only after the injected query loads — the component gets
`data`, never a loading branch. You can stick more than one query into a single
point; they run in parallel by default, and you see the loading state until all
of them have loaded. As for the error, you see the first one that comes up. When
more than one query is used and you want to bring the data into a normal shape
before the render, reach for [`.mapper`](mapper).

**Strip category: server-ssr-and-client.** Cut from the **server** bundle when
`ssr: false` (or after a [`.clientOnly()`](ssr) earlier in the chain) — its body
and the imports it uses are then removed from the server build; kept in the
client build always, and in the server build only when SSR is on. (It runs at
render: in the browser always, on the server only under SSR.) The full mechanics
are in [When the `.with` body is stripped](#when-the-with-body-is-stripped)
below.

But there's much more to `.with`, and that's what this page is about.

- What do we do if we need to use data from one query as the input to another
  query?
- Or if we need to get the data for a query's input from some external hook
  altogether?
- Or we want to react to the status of each individual query up until the moment
  they load successfully?

This is exactly where the rest of `.with` comes in handy.

## `.with` as a query injector

Let's look at injecting a single query into a page. We've already seen this, and
it's convenient to do it exactly this way:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(
    ({
      // here we have the loaded data from the query
      data: { idea },
      // here we have the loaded queries themselves
      queries: [ideaViewQueryResult],
    }) => <h1>{idea.title}</h1>,
  )
```

The point you inject doesn't have to be a standalone [`.query()`](query). Any
point that carries a query works — including a [component](component) (or a
[layout](layout)/[page](page)). It's read as its **query**: the data is injected
and flows into `data`, while its own UI is **not** rendered. So a component
built for one screen can be reused elsewhere purely for its data, and the input
is required exactly when that point's input is — the same rule as a query:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  // IdeaStats is a component with its own loader and UI, but here we inject it
  // for its query alone: its data lands in `data`, its UI is never rendered
  .with(IdeaStats, ({ params }) => ({ id: params.id }))
  .page(({ data: { fans } }) => <h1>{fans} fans</h1>)
```

But the same thing can be written by passing a function — each `.with` mimics a
component wrapper around the component below it, so you can freely call hooks
inside:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ params }) => {
    // it's specifically by returning the result of useQuery()
    // that we get data and queries in the following methods
    return ideaViewQuery.useQuery({ id: params.id })
  })
  // from here on nothing changes
  .page(({ data: { idea }, queries: [ideaViewQueryResult] }) => (
    <h1>{idea.title}</h1>
  ))
```

To inject several queries from one function, return an array of them:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ params }) => {
    // you can return an array of queries straight from a single .with()
    return [ideaViewQuery.useQuery({ id: params.id }), ideaBestQuery.useQuery()]
  })
  .page(({ queries: [ideaViewQueryResult, ideaBestQueryResult] }) => (
    <>
      <h1>{ideaViewQueryResult.data.idea.title}</h1>
      <h2>{ideaBestQueryResult.data.bestIdea.title}</h2>
    </>
  ))
```

Now the first way of using the data of one query as the input to another:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ params }) => {
    const ideaViewQueryResult = ideaViewQuery.useQuery({ id: params.id })
    // say ideaViewQueryResult.data.idea.similarIds holds the ids of similar ideas
    const ideaListQueryResult = ideaListQuery.useQuery(
      // the first argument is the input as usual,
      // but this isn't very convenient — the input probably expects ids strictly as
      // an array, not "array or undefined", so we'd have to tack on `as never`,
      // which is awful; that's why another way exists, covered below
      { ids: ideaViewQueryResult.data?.idea.similarIds } as never,
      // in the second argument we can pass the options of the classic useQuery,
      // and we simply say not to enable this query until ideaViewQueryResult loaded
      { enabled: !!ideaViewQueryResult.data },
    )
    return [ideaViewQueryResult, ideaListQueryResult]
  })
  // a disabled query still has a real status of pending,
  // so we won't get here until ideaViewQueryResult has loaded
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title}</h1>
      <h2>Similar ideas</h2>
      <ul>
        {ideaListQueryResult.data.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

These tricks with `enabled` are kind of clunky, so there's another way I like
more — covered in the `resolve` sections below.

## `.with` as a state manager

Inside a `.with` function you can short-circuit the chain. Returning a React
element renders it; returning `'loading'` or an `Error` renders the loading or
error component you set up the chain:

```tsx
export const strangePage = root.lets
  .page('/strange')
  .with(({ LoadingComponent, ErrorComponent }) => {
    // LoadingComponent holds what we declared earlier in .loading()
    // ErrorComponent holds what we declared earlier in .error()
    const [isLoading, setIsLoading] = useState(true)
    const [error] = useState(() =>
      Math.random() > 0.5 ? new Error('Oh, how wrong I was') : undefined,
    )

    useEffect(() => {
      setTimeout(() => setIsLoading(false), 1000)
    }, [])

    if (isLoading) return <LoadingComponent />
    if (error) return <ErrorComponent error={error} />

    // return undefined — or just nothing — to render the following methods
  })
  // we won't reach the render until all .with() calls have resolved
  .page(() => (
    <h1>I loaded something, I don't know what, but I pulled it off</h1>
  ))
```

There's a shorter notation I like more — the reserved word `'loading'` is the
same as `<LoadingComponent />`, and any `instanceof Error` is the same as
`<ErrorComponent error={...} />`:

```tsx
export const strangePage = root.lets
  .page('/strange')
  .with(() => {
    const [isLoading, setIsLoading] = useState(true)
    const [error] = useState(() =>
      Math.random() > 0.5 ? new Error('Oh, how wrong I was') : undefined,
    )

    useEffect(() => {
      setTimeout(() => setIsLoading(false), 1000)
    }, [])

    // same as return <LoadingComponent />
    if (isLoading) return 'loading'
    // same as return <ErrorComponent error={error} />
    if (error) return error

    // return nothing to render the following methods
  })
  .page(() => (
    <h1>I loaded something, I don't know what, but I pulled it off</h1>
  ))
```

An error returned this way can even carry an HTTP status, which is honored
during the SSR render — `return new ErrorPoint0('Failed', { status: 500 })`.
Returning any string other than `'loading'`, or an array from a plain function,
is a type error: those shapes are reserved.

## `.with` as a props injector

Suppose in one `.with` hook we got some computation result and want to use it in
another `.with` hook, or on the page itself. Return a plain object and it
becomes props, merged into `props` for every later method. The merge is a
shallow spread (`{ ...prev, ...next }`), so a later `.with` can overwrite an
earlier key — even change its type:

```tsx
export const strangePage = root.lets
  .page('/')
  .with(() => {
    // anything that isn't a react element, an Error, the word 'loading',
    // or a query result, is treated as props for the following methods
    return { x: 1, y: 2 }
  })
  .with(({ props: { x, y } }) => {
    return {
      a: x * 10,
      b: y * 100,
      // props can be overwritten even with a different type, because in essence
      // this is nextProps = { ...prevProps, ...newProps }
      x: 'I decided I will be a string',
    }
  })
  .page(({ props: { a, b, x, y } }) => (
    <h1>
      {a} {b} {x} {y}
    </h1>
  ))
```

## `.with` as a wrapper

The function's argument also carries `children` — the rendered rest of the
chain. Return them wrapped and you get a boundary around everything downstream:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ children }) => {
    return <div style={{ border: '1px solid red' }}>{children}</div>
  })
  .page(() => <div id="page">Hello!</div>)
```

This differs from returning a _self-contained_ element: an element that doesn't
include `children` **blocks** the chain — the rest never renders, and any
queries it would have injected never run. Wrap with `children` to keep the
chain; return a standalone element to stop it.

## `.with` as an idea

Now let's combine everything to see how else `.with` lets us use the data of one
query in the input of another. This is what I arrived at while building a real
project on the framework, and it becomes convenient once you're writing not your
first page:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(({ queries: [ideaViewQueryResult] }) => {
    // unlike .page(), every .with() receives queries in an indeterminate state —
    // here it could be an error, loading, or the loaded result, and we handle it

    // covered in ".with as a state manager"
    if (ideaViewQueryResult.isError) return ideaViewQueryResult.error
    if (ideaViewQueryResult.isLoading) return 'loading'

    // covered in ".with as a props injector"
    return { similarIds: ideaViewQueryResult.data.idea.similarIds }
  })
  // we won't reach this .with() while the previous one is intercepting control
  .with(ideaListQuery, ({ props: { similarIds } }) => ({ ids: similarIds }))
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title}</h1>
      <h2>Similar ideas</h2>
      <ul>
        {ideaListQueryResult.data.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

All this manual handling of query states is verbose, so there's a `resolve`
helper. It takes a query result; while the query is loading or erroring it
returns the loading or error state, and on success it maps the data to props
passed further down. The same example, shorter:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(({ queries: [ideaViewQueryResult], resolve }) => {
    // the same as above, but short
    return resolve(ideaViewQueryResult, ({ data }) => ({
      similarIds: data.idea.similarIds,
    }))
  })
  .with(ideaListQuery, ({ props: { similarIds } }) => ({ ids: similarIds }))
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title}</h1>
      {/* ... */}
    </div>
  ))
```

Resolving before continuing is needed often enough that an even shorter notation
bakes `resolve` right into the query injection — as the **fourth** argument:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(
    ideaViewQuery,
    ({ params }) => ({ id: params.id }),
    undefined, // useQuery options could go here, not needed now
    ({ data }) => ({ similarIds: data.idea.similarIds }),
  )
  .with(ideaListQuery, ({ props: { similarIds } }) => ({ ids: similarIds }))
  .page(/* ... */)
```

`resolve` also helps when you want to call a query but **don't** want it to land
in the `queries` array or in `data`. That's handy for the current user,
requested in a previous point — you want it in `props`, while `data` stays free
for the page's own data:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ resolve }) => {
    // since we don't return the useQuery result from this .with(),
    // it won't land in queries or data — only the props from resolve() survive
    return resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me }))
  })
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea }, props: { me } }) => (
    <div>
      <h1>{idea.title}</h1>
      <p>Hello, {me.name}!</p>
    </div>
  ))
```

## The argument that `.with(fn)` receives

The function form receives one object. Here's everything on it:

| Key                                     | What                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `status` / `loading` / `error` / `data` | the accumulated state so far                                                        |
| `props`                                 | props contributed by earlier `.with` calls                                          |
| `queries`                               | injected queries — **in an indeterminate state** here (may be loading or errored)   |
| `params` / `search` / `input`           | present when the matching schema exists                                             |
| `location`                              | present on pages and layouts                                                        |
| `resolve`                               | the [resolve helper](#resolve-forms)                                                |
| `children`                              | the rendered remainder of the chain                                                 |
| `LoadingComponent` / `ErrorComponent`   | the components you set with [`.loading`](loading-error) / [`.error`](loading-error) |

There is **no `ctx`** here — `ctx` is server-only and lives in `.ctx` and
loaders. If you need a ctx value at render, merge it into props in a
[plugin](plugin) first. (`.ctx` is server-only — cut from the client bundle: its
body and the imports it uses are removed, so it never ships to the browser;
that's the opposite category from `.with`.)

### What you can return

| Return                                                | Effect                                             |
| ----------------------------------------------------- | -------------------------------------------------- |
| a query result, or an array of them                   | appended to `queries` (`data` = the first)         |
| `'loading'`                                           | render the loading component                       |
| an `Error`                                            | render the error component (status honored in SSR) |
| a `RedirectTask`, or an `Error` with `.redirect`      | redirect                                           |
| a React element (with `children`)                     | wrap the rest of the chain                         |
| a React element (standalone)                          | render it and **stop** the chain                   |
| a plain object                                        | shallow-merge into `props`                         |
| `undefined` / nothing                                 | proceed to the next method                         |
| a non-`'loading'` string, or an array from a plain fn | **type error** — those shapes are reserved         |

### `resolve` forms

```tsx
resolve(query) // wait, contribute nothing to props
resolve(query, true) // wait, then spread the query's data into props
resolve(query, ({ data }) => props) // wait, then map success to props
```

The key difference from injecting a query with `.with(query, …)`: a query you
`resolve` does **not** land in `queries` or `data` — only the props you derive
from it survive. The fourth-argument form (above) is the opposite: it injects
the query **and** maps extra props alongside it.

## When the `.with` body is stripped

`.with` is **server-ssr-and-client** render code, so the rule is symmetric to
other render methods (`.page`, `.layout`, `.component`, `.provider`, `.loading`,
`.error`, `.wrapper`, `.mapper`, `.head`):

- From the **server** build, the `.with` body — and the imports it pulls in —
  are **cut** when `ssr: false`, or after a [`.clientOnly()`](ssr) earlier in
  the chain (which makes the rest of the point client-only). Nothing from that
  argument lands in the server bundle then. It's kept in the server build only
  when SSR is on, so the point can render server-side.
- From the **client** build, nothing is cut — `.with` always ships and runs at
  render in the browser. (Server-only methods around it, `.ctx`, server
  `.loader`, …, are the ones cut from the client bundle; `.with` itself is not.)

That's also why `.with` runs "at render, on the client and — under SSR — on the
server too": under SSR the first paint is server-rendered, and after that, page
navigations are client-side (SPA-style), running `.with` in the browser.

## Security: gate access in `.with`, not `.ctx`

A `.ctx` gate runs **only when the point has a loader**, so a loader-less page
wouldn't run it at all. `.with`, by contrast, runs at render on every point. For
an authorization gate that always fires, return an `Error` from `.with`:

```tsx
export const authorizedPlugin = Point0.lets
  .plugin()
  .with(({ props: { me } }) => {
    if (!me) {
      return new ErrorPoint0('Only for authorized users', {
        code: 'UNAUTHORIZED',
      })
    }
    return { me }
  })
  .plugin()
```

`ErrorPoint0` is the framework's default error class; you can swap it for your
own class of the same-or-wider shape via `.errorClass(...)` — see
[error handling](error-handling). A common production shape combines both gates:
a `.ctx` that resolves the user for server loaders and a `.with` that resolves
it for the render — see [Plugin](plugin).

An `Error` you return (not throw) from `.with` is normalized through that error
class and rendered by the error component, the same as a thrown one — see
[How a thrown error reaches the error component](error-handling#how-a-thrown-error-reaches-the-error-component).

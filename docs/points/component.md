---
index: 300
title: Component
description:
  A component is a point that composes queries and UI but has no route — a
  reusable mountable, not a page.
---

A component is a point you mount inside other points. It composes its own data
and UI like a [page](page), but it has no route — you place it yourself with a
JSX tag wherever you need it. Because it's a point, it gets the whole chain:
`.with`, `.loader`, `.clientLoader`, `.mapper`, and loading/error states
resolved up the chain.

```tsx
import { root } from '@/lib/root'

export const BestIdea = root.lets
  .component<{ cta: string }>() // declares an outer prop: cta
  .loader(async () => {
    const bestIdea = await prisma.idea.findFirstOrThrow({
      orderBy: { id: 'desc' },
    })
    return { bestIdea } // becomes `data`
  })
  .wrapper(({ children }) => <div className="card">{children}</div>)
  .component(({ data, props }) => (
    <div>
      <h2>Best idea: {data.bestIdea.title}</h2>
      <p>{props.cta}</p>
    </div>
  ))
```

```tsx
// mount it anywhere — pass its declared props:
<BestIdea cta="It is awesome!" />
```

The component loads `bestIdea` on the server, shows the nearest loading
component while it loads, and renders once the data is ready.

Stripping in brief: `.loader` and `.input` are **cut from the client bundle** —
their bodies and the imports they use are removed, so they never ship to the
browser (server-only). `.wrapper` and the closing `.component(render)` are **cut
from the server bundle when `ssr:false`** (or after a `.clientOnly()`) — body
and imports removed from the server build; kept in the client build always, and
in the server build only when SSR is on (server-ssr-and-client).

## Component, page, or plain React component?

A component sits between a [page](page) and an ordinary React component:

- **vs. a page** — a component has **no route**. You don't navigate to it; you
  mount it with a tag inside another point. Its `.lets` takes no route argument,
  and the inner render gets no `location`.
- **vs. a plain React component** — a component **is a point**. It carries the
  full chain (`.loader`, `.with`, `.mapper`, loading/error, a self query), so
  `<MyComponent />` renders all of that, not just markup you wrote by hand.

A component is one of the four **mountables** — [page](page), [layout](layout),
component, [provider](provider) — and they share the same method surface (see
[mountable](mountable)). The difference is registration and routing: pages and
layouts are collected and mounted by the router automatically; **components and
providers you declare and mount yourself**.

## Declaring a component

Open with `.component()` (no route), build the chain, close with
`.component(component)`:

```tsx
export const Stats = root.lets
  .component()
  .loader(async () => ({ count: await prisma.idea.count() }))
  .component(({ data }) => <span>{data.count} ideas</span>)
```

The component's name (`Stats`) is read from the variable — see [points](points)
for the notation.

The closing `.component(render)` is **server-ssr-and-client** — cut from the
server bundle when `ssr:false` (or after a `.clientOnly()` earlier in the
chain).

A component can be opened off a [root](root) or a [base](base), and also off a
[page](page) or [layout](layout) — anywhere in the chain.

### Declaring outer props

The optional generic on `.component<...>()` declares the props the component
accepts at its mount site:

```tsx
export const Greet = root.lets
  .component<{ name: string }>()
  .component(({ props }) => <p>Hi, {props.name}</p>)

// at the mount site, the prop is required and typed:
<Greet name="Sergei" />
```

Props you declare here show up as `props` inside every later method — `.with`,
`.loader`'s context, the mapper, and the render.

### The closing argument is optional

`.component(component)` takes a single, **optional** component. Omit it and the
component renders nothing (`() => null`) — but you must still call
`.component()` to close the chain and produce the mountable:

```tsx
export const Effect = root.lets
  .component()
  .with(/* runs an effect via a wrapper */)
  .component() // renders nothing
```

## Getting data into a component

Like a page, a component renders only once its data is ready. Two ways to attach
data.

**Own loader.** Put a [`.loader`](loader) on the component. `.loader` (and the
`.input` server schema beside it) is **server-only** — cut from the client
bundle, so your database code and its dependencies never ship to the browser.

```tsx
export const IdeaScreen = root.lets
  .component()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => {
    const idea = await prisma.idea.findUniqueOrThrow({ where: { id: input.id } })
    return { idea }
  })
  .component(({ data }) => <h1>{data.idea.title}</h1>)

// mount with input:
<IdeaScreen input={{ id: 123 }} />
```

**Injected query.** When the data lives in a reusable [query](query), hand it to
the component with [`.with`](with), mapping its outer props to the query input:

```tsx
export const SimilarIdeas = root.lets
  .component<{ ids: number[] }>()
  .with(ideaListQuery, ({ props }) => ({ ids: props.ids }))
  .component(({ data }) => <IdeaList items={data.ideas} />)

<SimilarIdeas ids={idea.similarIds} />
```

This is the idiomatic reason to reach for a component: instead of one fat page
loader fetching everything, let each component load the data it needs.

`.with` is **server-ssr-and-client** — cut from the server bundle when
`ssr:false` (or after a `.clientOnly()`); it always ships to the browser.

You can also skip `.with` and call `ideaListQuery.useQuery({ ids })` inside the
render, handling `isLoading` yourself — the component doesn't force either
style.

Inject more than one query and read them from `queries` (in `.with` order), or
fold them into one shape with [`.mapper`](mapper). The full range of `.with`
forms — react-query options, `resolve`, props — is on the [`.with`](with) page.

### A production shape: query + plugin

```tsx
export const SocialAccountsLinking = root.lets
  .component()
  .with(listAccountsQuery)
  .use(authorizedOnlyPlugin) // a plugin that gates + supplies props.me
  .component(({ data, props }) => {
    const google = data.accounts.find((a) => a.providerId === 'google')
    return <AccountRow me={props.me} account={google} />
  })
```

`.use` (plugins) is **server-and-client** — not cut from either bundle
(isomorphic); the plugin's own `.ctx`/`.loader` parts are still cut from the
client bundle per their kind (server-only).

## Loading and error states

A component with a loader suspends while it loads, so Point0 shows the nearest
[`.loading`](loading-error) component up the chain, then the render; if its
loader throws, it bubbles to the nearest [`.error`](loading-error). A component
**without a loader** does not suspend — it renders synchronously, no loading
flash.

Set `.loading` / `.error` once on the root and they cover every component
beneath it, or override either on the component itself:

```tsx
export const Stats = root.lets
  .component()
  .loading(() => <StatsSkeleton />)
  .loader(/* ... */)
  .component(/* ... */)
```

The `.loading` must appear before the data method that can suspend. Full rules
are in [Loading & error](loading-error).

Both `.loading` and `.error` are **server-ssr-and-client** — cut from the server
bundle when `ssr:false` (or after a `.clientOnly()`).

### The wrapper covers loading too

[`.wrapper`](mountable) wraps the component's whole tree — including its loading
and error states, not just the success render:

```tsx
.wrapper(({ children }) => <div className="card">{children}</div>)
// the spinner renders inside .card while loading; so does the final content
```

`.wrapper` is **server-ssr-and-client** — cut from the server bundle when
`ssr:false` (or after a `.clientOnly()`).

## Mounting a component

A component's `.X` is its mountable React element, and the short notation drops
the `.X`:

```tsx
<Stats />     // short notation (preferred)
<Stats.X />   // explicit — identical
```

The short `<Stats />` only works because the variable is PascalCase — JSX treats
a lowercase tag as a DOM element, so a component declared as `const stats = …`
could only be mounted as `<stats.X />`. Always name a component with a capital
first letter.

Pass `input` (when the component has any input schema — `.input`,
`.clientInput`, or `.sharedInput`) and your declared props at the mount site:

```tsx
<IdeaScreen input={{ id: 123 }} />
<Greet name="Sergei" />
```

**Props at the mount site win.** If a prop of the same name was contributed
earlier (e.g. by a base `.with`), the value you pass at the tag overrides it.

**Use a component as a wrapper.** Declare `children` as an outer prop and render
it:

```tsx
export const Frame = root.lets
  .component<{ children: React.ReactNode }>()
  .component(({ props }) => <section className="frame">{props.children}</section>)

<Frame><Inner /></Frame>
```

## Component or endpoint?

A component is a [mountable](mountable), not automatically an HTTP endpoint —
but it becomes one when it has a server loader:

- **With a `.loader()`** → the loader needs a URL, so the component gets a real
  endpoint at `POST /_point0/<scope>/component/<kebab-name>`. During SSR its
  data is fetched on the server and dehydrated into the cache; during SPA
  navigation it's fetched on the client.
- **With only a `.clientLoader()`** → the component has **no endpoint**.
  `.clientLoader` is **client-only** — **cut from the server bundle**: its body
  and imports are removed, regardless of SSR (it runs in the browser). During
  SSR it is not server-prefetched; it shows the loading state until the client
  loads it.
- **With no loader** → no endpoint, no SSR fetch, no loading flash. A pure
  client-only mountable.

The component endpoint uses `POST` (like a query/mutation/provider), not the
`GET` that pages and layouts use for their dehydrated-state endpoint.

## A component with a loader is also a query

A component with a loader carries a _self query_, the same way a page does — so
you can fetch and prefetch it like any [query](query):

```tsx
Stats.useQuery()
Stats.fetchQuery()
Stats.prefetchQuery()
Stats.getQueryKey()
```

This is what makes the component's SSR and client fetch work without extra
wiring. A component with no server loader exposes no useful query — only the
mountable surface (`.X`, `.Component`).

The component's self query is **finite by default**, but you can make it
**infinite** by closing the loader with `.infiniteQuery({...})` after it — any
mountable can. The live react-query key is the array form
`['point0', { scope, type, name, mode, finiteness, tags, output, input }]`; its
serialized (dehydration) form is the pipe-joined prefix
`point0|<scope>|component|<name>|server|finite||data|{...input}` (the empty `||`
is an empty tags segment; `finite` becomes `infinite` when you close with
`.infiniteQuery`).

## Gating a component

A component's `.ctx` runs **only when the component has a loader** — a
loader-less component makes no server request, so its `.ctx` never executes and
can't protect anything, and whatever it renders ships to the client
(server-rendered into the HTML under SSR, then again in the browser). Don't rely
on a component's own `.ctx` to keep something private: gate access with a
[`.with`](with) wrapper, or a [plugin](plugin) that combines `.ctx` and `.with`:

```tsx
import { authPlugin } from '@/lib/auth' // a plugin that resolves the user into props.me
import { ErrorPoint0 } from '@point0/core'

export const AdminStats = root.lets
  .component()
  .use(authPlugin)
  .with(({ props: { me } }) => {
    if (!me?.isAdmin) return new ErrorPoint0('Forbidden', { code: 'FORBIDDEN' })
    return { me }
  })
  .loader(/* ... */)
  .component(/* ... */)
```

`.ctx` is **server-only** — cut from the client bundle: its body and the imports
it uses are removed, so it never ships to the browser. `.with` is
**server-ssr-and-client** — always kept in the client build — so the gate above
relies on `.with` returning an error to short-circuit, not on `.ctx` to hide
markup.

`me` has to come from somewhere — here a [plugin](plugin) puts it in `props`
first. Returning an error from `.with` short-circuits to the error component.
`ErrorPoint0` is the default; you can swap in
[your own error class](error-handling) via `.errorClass(...)`.

## Reference

### Inner component props

The `.component(fn)` callback receives one object:

| Prop               | Type                                            | When                                      |
| ------------------ | ----------------------------------------------- | ----------------------------------------- |
| `data`             | mapper output, or the first query's data        | always (`{}` if none)                     |
| `queries`          | tuple of loaded query results, in `.with` order | always (`[]` if none)                     |
| `props`            | outer props + props from `.with`                | always (`{}` if none)                     |
| `input`            | parsed input                                    | only with `.sharedInput` / `.clientInput` |
| `LoadingComponent` | the resolved loading component                  | always                                    |
| `ErrorComponent`   | the resolved error component (`{ error }`)      | always                                    |

A component has **no `location`** prop (it has no route — that's the page/layout
difference).

`input` is visible in the render only with [`.sharedInput`](validation) or
[`.clientInput`](validation). A plain [`.input`](validation) is server-only and
not re-validated on the client, so it does not appear in the render props. With
`.sharedInput`, any transform runs again on the client at mount.

### Outer props (the mount site)

```tsx
<MyComponent
  input={
    {
      /* final input */
    }
  }
  {...declaredProps}
/>
```

A component accepts `input` when it has any input schema (`.input`,
`.clientInput`, or `.sharedInput`) plus the props you declared with
`.component<...>()`. (In the render props, `input` appears only with
`.clientInput` / `.sharedInput`; the mount site requires it for a plain server
`.input` too.) It has no framework `children` prop — declare `children` yourself
if you want a wrapper component.

### Methods that apply to a component

Each method below is tagged with its strip category. The category names what's
**cut and from which bundle** (body + the imports it uses pruned along with it):
**server-only** = cut from the client bundle · **client-only** = cut from the
server bundle · **server-and-client** = cut from neither (isomorphic) ·
**server-ssr-and-client** = cut from the server bundle when `ssr:false`.

Data & context:

- [`.loader`](loader) — server-only.
- `.clientLoader` — client-only.
- [`.ctx`](ctx) — server-only.
- [`.with`](with) — server-ssr-and-client.
- [`.mapper`](mapper) — server-ssr-and-client.
- [`.input`](validation) — server-only.
- [`.clientInput`](validation) — client-only.
- [`.sharedInput`](validation) — server-and-client.
- `.headers`, `.cookies` — server-only.

UI:

- [`.loading`](loading-error), [`.error`](loading-error),
  [`.wrapper`](mountable) — server-ssr-and-client.

(`.componentLoading` / `.componentError` also exist as type-specific aliases —
same server-ssr-and-client category — but on a component plain `.loading` /
`.error` is the way.)

Shared:

- [`.use`](plugin) (plugins) — server-and-client.
- [`.middleware`](middleware) — server-only.
- `.on` — server-and-client; `.serverOn` — server-only; `.clientOn` —
  client-only.
- `.tag` — server-and-client.
- `.description` — server-only.
- `.fetchOptions` — server-and-client.
- `.clientOnly` — the switch that makes everything after it behave as
  `ssr:false` (so the server-ssr-and-client methods after it are cut from the
  server build).

A component **cannot** use `.params`, `.search`, or `.body` — those are for
[pages](page) and [actions](action) and are a type error on a component:
`For "component" not allowed "params" schema. Only "input" are allowed.` It also
has no `.route`, `.layout`, `.provider`, or prefetch methods. `.head` is
meaningful only for routed pages/layouts.

After `.component(...)`, a loader-bearing component exposes the full query
surface (`useQuery`, `fetchQuery`, `prefetchQuery`, `getQueryKey`,
`invalidateQuery`, …) alongside `.X` and `.Component`. See [query](query) for
the full method list.

### Components are not code-split the way pages are

A page is mounted by the router through the generated points manifest, which the
client side loads lazily by default — so a page's module is its own chunk,
fetched when you navigate to it. A component is different: you mount it yourself
with a `<Stats />` tag, so it ships inside whatever module imports it. There is
no automatic per-component code splitting at the mount site. To defer a heavy
component's code, wrap it in your own `React.lazy` / `Suspense` like any other
React component.

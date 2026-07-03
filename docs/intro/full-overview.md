---
index: 300
title: Full Overview
description:
  The whole framework in one long read — every major feature as a code example.
video: https://www.youtube.com/watch?v=lhZ6eWMXMdg
---

I want to announce my framework, Point0. It is the first Bun FullStack framework
comparable in functionality to Next.js and TanStack Start. However, it has a
radically different DX, which is exactly what it was created for.

I never liked the existing frameworks, especially Next.js and Remix (React
Router). But I assumed that, apparently, frameworks just can't be made any other
way, which is why no one does it. And that the bulkiness, the strict conventions
imposed by others, the clumsiness of the architecture, were simply a necessary
evil I had to put up with.

At some point a critical feeling built up inside me that things really should be
completely different. And I thought: let me write some pseudocode on an
imaginary framework that would suit me, without any regard at all for whether it
could be implemented. I'll just write a project as if the ideal framework
already existed.

And it turned out so well that I simply forgot about everything in the world and
spent 10 months building the implementation of this framework, and 3 months ago
I even quit my job to finish it off sooner. And now I've finished it, and I want
to share it with you.

## Introduction

The article is long; it describes the main features of the Point0 framework, but
only the most interesting parts and in the form of code examples. A deeper
description lives on the documentation pages.

Read everything up to and including the "Root point" section — this is the most
important part, and it takes 5 minutes to read. After that, if you get tired,
skim through, glancing at the headings and the pieces of code that catch your
attention. Read "Engine" and "CLI". Keep skimming down to "Deploy", and read
through to the end.

And if you make it through the entire article, you'll have all the knowledge you
need to start creating projects on Point0 right now.

## Page

What I wanted from a page:

- To declare the path to this page
- To declare what data it loads
- For the loading state and error display to work on their own and be fully
  customizable
- For it to just work whether with SSR or without SSR, so I never have to think
  about it
- To be able to declare pages in any files, any number of them within a single
  file, in any folders of the project, with the framework not dictating where I
  should do this or how to name my files and variables

```tsx
import { root } from '@/lib/root'

export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .loader(({ params }) => {
    // params here are typed, because in the route string we wrote :id, and TypeScript knows how to parse that
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .head(({ data: { idea } }) => ({
    // here the data is typed on its own, simply because we returned it from the loader
    title: idea.title,
    description: idea.content.slice(0, 100),
  }))
  .page(({ data: { idea } }) => (
    // here it's typed too, naturally
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))
```

So we got a little page. Here are the rules I set for myself to keep developing
the framework's design further:

- We'll call all entities points. Here you see a page point, and later I'll show
  you queries, mutations, layouts, providers, and more.
- When analyzing a point, we should be able to understand everything that
  affects it just by looking at the code of the point itself, without keeping in
  mind the existence of some configs in other files, or even other constructs in
  the same file. In this example we understand that everything concerning this
  page is described right in the code of the point itself, and also that it's
  affected by a certain `root` that it grows out of. `root` is also a point,
  I'll talk about those a bit later too.
- Points can form chains to reuse some settings. In particular, on this page you
  don't see what markup my loading and error states have, because they're
  included in `root`, which I haven't shown you yet. And this is done because
  essentially I need to have the same look for loading and errors everywhere,
  and I don't want to duplicate this in the point of every page. At the same
  time, I can easily override them either for a single page or for a group of
  pages by creating a separate parent point for them — it'll be called the
  `base` point, but that's also later.
- Every point begins with the `.lets` construct, which means "Let's make a
  page/query/mutation/... with such-and-such name", then ideally it would have
  no arguments, but some are still necessary in order to have typed things; in
  the case of a page the required argument is its path, which is generally
  logical.
- Every point ends with what we designated in `.lets`. We said
  `.lets('page', ...)`, so at the end of the builder there will be `.page(...)`.
  We said `.lets('query', ...)`, so at the end there will be `.query(...)`.
  There's a certain poetry in this, a refrain so to speak.
- We don't generate types, unlike other frameworks; everything sits on the
  generics of the builder itself and just works on its own, you don't have to
  write the types yourself.
- Server and client code should be able to coexist peacefully in one file, in
  one point construct, and I shouldn't have to worry about it. The framework
  itself should worry about it — code splitting or whatever; I just want to be
  safeguarded so that server code doesn't end up in the client. In the end, this
  is handled by the compiler, which I'll talk about later.

Read more in the docs [about pages](page).

## Mutation

What I wanted from a mutation:

- To be able to declare it in the file where it will be used, if I want, and for
  it not to break HMR
- To be able to use it by referring to it directly, rather than through an index
  file like in tRPC, because in tRPC when there are many endpoints the code
  editor starts to lag, since referring to even one endpoint pulls in the types
  of all endpoints
- For the validation schema to be declarable through any library. zod alone is
  enough for me. But we're making the very best framework, so we need to let
  everyone use any validation schema
- For the validation schema to be extendable in case of point chaining. That is,
  part of the schema should be declarable in the parent point
- For it to be an ordinary react-query mutation at its core

```tsx
import { root } from '@/lib/root'
import { z } from 'zod'
// The form is not part of the framework. Just imagine
// that you have nice components for building forms in your project
import { Form, Input, Textarea, Button } from '@/lib/form'
// But navigation IS part of the framework, more on that later
import { navigate } from '@/lib/navigation'

export const ideaUpdateMutation = root
  .lets('mutation', 'ideaUpdate')
  .input(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      content: z.string().min(1),
    }), // this could be not zod here, but for example TypeBox
  )
  .loader(async ({ input: { id, title, content } }) => {
    const idea = await prisma.idea.update({
      where: { id },
      data: { title, content },
    })
    return { idea }
  })
  .mutation() // you can pass an options object as an argument here,
// which will go into useMutation/fetchMutation of ordinary react-query

export const ideaEditPage = root
  .lets('page', 'ideaEdit', '/ideas/:id/edit')
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .head(({ data: { idea } }) => `Edit: ${idea.title}`)
  .page(({ data: { idea } }) => (
    <div>
      <h1>Edit idea: {idea.title}</h1>
      <Form
        defaultValues={{
          title: idea.title,
          content: idea.content,
        }}
        onSubmit={({ title, content }) => {
          await ideaUpdateMutation.fetchMutation({
            id: idea.id,
            title,
            content,
          }) // and here, as a second argument,
          //  you can pass any arguments that will be merged with those declared earlier in the mutation itself
          await navigate('idea', { id })
        }}
      >
        <Input label="Title" name="title" />
        <Textarea label="Description" name="content" />
        <Button>Save</Button>
      </Form>
    </div>
  ))
```

So we got a mutation. I can use it whether in this file or in another, simply by
importing the mutation itself. The types aren't overloaded at all, the code
editor doesn't lag, it feels as natural as possible. Here I declared a mutation,
here I called it. Cool!

After creating a mutation, the basic methods of a classic react-query mutation
are also available on it:

```ts
myMutation.getMutationKey(input, ...)
myMutation.getMutationOptions()
myMutation.getMutationCache()
myMutation.getMutationsCache()
myMutation.useMutation()
myMutation.fetchMutation()
```

The only difference is that the input is taken as the first argument here, and
it's what forms the unique `mutationKey` for this specific request, as well as
the body of the mutation function itself.

Read more in the docs [about mutations](mutation).

## Query

While implementing the edit page, I noticed that we have the loader code
completely duplicated on the view page and the edit page for an idea. And in
fact we could move the loader code itself into a separate function and reuse it.
But that's not it. Because while creating the framework I came to the conclusion
that the loader is in fact just react-query under the hood, which means we need
this to be literally one query, with the same cache, so that no extra requests
go to the server. There are pages where the loader is really one-of-a-kind for
the whole project, and then it's convenient to declare the loader right on the
page. But if the loader is reused, then it makes sense to move it into a
separate query and reuse that query in the pages themselves.

```tsx
import { root } from '@/lib/root'

export const ideaViewQuery = root
  .lets('query', 'ideaView')
  .input(
    z.object({
      id: z.string().min(1),
    }),
  )
  .loader(async ({ input: { id } }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id },
    })
    return { idea }
  })
  .query() // you can pass an options object as an argument here,
// which will go into useQuery/fetchQuery of ordinary react-query

export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  // here we inject this query into the page itself
  // and define how the params from the route will be mapped onto the query's input
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  // further on, no changes, and all the types are in place, since we grabbed them
  // from the type of the returned query data itself, which we snatched from its loader
  .head(({ data: { idea } }) => ({
    title: idea.title,
    description: idea.content.slice(0, 100),
  }))
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))

export const ideaEditPage = root
  .lets('page', 'ideaEdit', '/ideas/:id/edit')
  // exactly the same way we inject this same query into another page
  // on that page we could have also written it like this, since the type of
  // params on the page itself matches the type of the query's input
  .with(ideaViewQuery, ({ params }) => params)
  .head(({ data: { idea } }) => `Edit: ${idea.title}`)
  .page(({ data: { idea } }) => (
    // ...
    // nothing new here, all the same as before, same form with a mutation
    // ...
  ))
```

So we got a query. And a new point method was also introduced, called `.with()`.
This `.with()` is a real Swiss army knife that lets you not only inject queries,
but do much more — I'll talk about it a bit later.

The most important thing is that a query, like a mutation, can be declared
anywhere and used directly. The server code will be stripped out of it on the
client on its own. And what's more, this query can easily be used as just an
ordinary query in any ordinary component, without any `.with()`.

```tsx
import { ideaViewQuery } from '@/modules/idea'

export const MyUsualComponent = ({ id }: { id: string }) => {
  const result = ideaViewQuery.useQuery({ id }) // the input goes as the first argument
  // as the second argument you can pass options of classic react-query, which will be merged
  // with the options you declared in the point itself in the last .query({ ... }) method
  // if you declared them there

  // result now holds the original returned object of classic useQuery from react-query
  // you can even do this: const result = useQuery(ideaViewQuery.getQueryOptions({ id }))
  // you'll get the same thing, just longer to write
  if (result.isLoading) {
    return <div>Loading...</div>
  }
  if (result.error) {
    // By the way, our errors are never unknown, we have our own ErrorPoint0
    // Which you can replace with your own error class, and then here you'll have your AppError
    // This is also a separate topic
    return <div>{result.error.message}</div>
  }
  // at this stage we already know by the types that the data is here, because there's no loading and no error
  return (
    <div>
      <h1>{result.data.idea.title}</h1>
      <div>{result.data.idea.content}</div>
    </div>
  )
}
```

And for convenience, all the basic methods of classic react-query are available
right on the query's point:

```ts
myQuery.useQuery(input, ...)
myQuery.getQueryKey(input, ...)
myQuery.getQueryOptions(...)
myQuery.fetchQuery(...)
myQuery.prefetchQuery(...)
myQuery.getQueryData(...)
myQuery.ensureQueryData(...)
myQuery.refetchQuery(...)
myQuery.setQueryData(...)
myQuery.getQueryCache(...)
myQuery.getQueriesCache(...)
myQuery.getQueryState(...)
myQuery.cancelQuery(...)
myQuery.invalidateQuery(...)
myQuery.removeQuery(...)
myQuery.resetQuery(...)
```

The only difference is that the input is taken as the first argument here, and
it's what forms the unique `queryKey` for this specific request, as well as the
body of the query function itself. And the `queryKey` itself comes out literally
like this:

```ts
const ideaViewQueryKey = ideaViewQuery.getQueryKey({ id: 'my-super-duper-id' })
console.info(ideaViewQueryKey)
;[
  'point0',
  {
    scope: this.scope, // "root" by default, but if you have many clients, then here will be your client's scope
    // yes, with us you can have one server and many clients, for example one website, another an expo app, and a third an admin panel
    // and they can reuse queries and other points from a single codebase, and from each client the code
    // of the other clients it has nothing to do with will be cut out. That is, with us it's 1 server and as many clients as you want.
    // Read about this in the docs, but just know that we have a very serious framework here
    type: this.type, // in this case "query",
    // but we also have pages, whose loader is essentially a query too,
    // so here it could also be "page", and "layout", and a lot of other things — in short, the point type
    name: this.name, // this is the name of the point that we specified as the second argument in
    // .lets('query', 'ideaView'), that is, "ideaView"
    mode: 'server', // we also have client-side queries, I'll tell you about it soon
    finiteness: 'finite', // we have "infiniteQuery" and not just "query"
    // and it would be logical that just the "type" field above is enough, but that only seems so
    // because the page itself can declare that its loader returns the result as an infiniteQuery,
    // then here it'll be "infinite", while "type" will still remain "page"
    tags: [], // well, we can also cover the point itself with tags, so that later you can filter queries by them,
    // but just read about this in the documentation, here I'm trying to show the most interesting things,
    // and this is already a different topic
    output: 'data', // phew... Well, in general the idea is that here it's almost always just "data", but getting ahead of myself I'll say
    // that here it could also be "queryClientDehydratedState" for situations when we decided to prefetch all the queries on a page
    // before navigating to it, so that for example the interface doesn't flicker during the transition, but more on that later too
    input: '{"id":"my-super-duper-id"}', // just a stably stringified input. And what's more, if you used superjson
    // as a transformer, then here the very same transformation will also be baked in. More on transformers later too, but it's essentially also
    // like in tRPC, nothing new
  },
]
```

In general, you yourself never work with this query key directly. I showed you
this query key simply because soon in this article I'll be talking about some
parts of the implementation where an understanding of what this query key is
even made of will come in handy.

And before we go too far, a reminder that the loader we declared in the pages
themselves, like:

```tsx
export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))
```

makes these pages themselves into queries, and that's why you can do this:

```tsx
ideaPage.fetchQuery({ id: 'my-super-duper-id' })
ideaPage.useQuery({ id: 'my-super-duper-id' })
// and so on — in short, it's an ordinary query, while at the same time being a page
```

You can even do this, though it's weird, but it's allowed:

```tsx
// the same page, no changes here
export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))

export const ideaEditPage = root
  .lets('page', 'ideaEdit', '/ideas/:id/edit')
  // and here we used the ideaPage page itself instead of a query
  .with(ideaPage, ({ params }) => params)
  .head(({ data: { idea } }) => `Edit: ${idea.title}`)
  .page(({ data: { idea } }) => (
    // ...
    // nothing new here, all the same as before, same form with a mutation
    // ...
  ))
```

And in fact, although this is weird, it kind of even seems cool. But there's a
nuance here: it turns out that if we declare these pages in different files,
then the client bundle file for the idea edit page will also include the code of
the idea view page, while we only wanted the query. In general, if the pages are
small then it's fine. There won't be code duplication, the bundler will
distribute everything as needed — it's just a question of the size of the first
loaded chunk on this page. With us all pages are loaded lazily (you can disable
this and load them all at once), so in practice it's better to keep queries
separate and pages separate. But that's up to each person, let's each do as we
please. I specifically wanted to make the framework free of conventions and let
everyone create whatever they want, and build their own architecture and
conventions themselves.

Read more in the docs [about queries](query).

## The shorthand .lets notation

When I started writing examples and real projects, I got a bit tired of the
duplicated strings in constructions like

```tsx
export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  // ...
  .page()
```

And I thought it would be nice to have a short notation that behaves at runtime
exactly the same as the construction above:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  // ...
  .page()
```

This notation only works with the compiler enabled (more on it later), which
literally transforms the code in the second example into the code in the first
example. Its rule is: we take the variable name "ideaPage", and if it ends with
a point type "Page/Query/...", we cut off that suffix, which gives us the point
name "idea", and we simply replace the construction with the resulting one.

Both ways of declaring points are valid, and both are typed exactly as they
should be. But from here on in the text I'll use the short notation, because in
general I find it more convenient.

Read more in the docs [about points](points).

## Layout

What I wanted from a layout:

- I wanted to be able to declare which layout a page needs in the code of the
  page itself, instead of going to declare it in a separate file and on top of
  that importing the page into it by hand
- I wanted a layout to be able to define part of the page's path, which would be
  inherited by the page using it
- So that a layout, just like a page, could have its own loaders/queries, which
  handle their loading and error states by themselves exactly as page queries do
- So that when navigating between pages within the same layout, the layout's
  queries wouldn't be re-fetched and the layout wouldn't re-render

```tsx
export const ideasLayout = root.lets
  .layout('/idea')
  // here we can also use .with(), .loader(), .head() and so on
  .layout(({ children }) => {
    return (
      <div>
        <h1>Ideas Layout</h1>
        {children}
      </div>
    )
  })

// Now we can declare a page off the ideasLayout layout
export const ideaPage = ideasLayout.lets
  .page('/:id')
  // the resulting route will be: /idea/:id
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))
```

Layouts can also inherit from one another:

```tsx
export const generalLayout = root.lets
  // the path can be omitted entirely, then it will be '/' for the first layout,
  // or the previous route if one was declared earlier
  .layout()
  // I understand that the .layout().layout() construction looks strange, but that's the design of all points,
  // at the start of a point we need to explain what we're building, and then finish the builder with the same word.
  // In practice, almost always between these two moments we declare additional helpers
  // like .with(), .loader(), .head() and so on (and these are far from all the helpers, but more on that later)
  // if it bothers you in places, you can use .lets('layout', 'general').layout()
  .layout(({ children }) => {
    return (
      <div>
        <h1>General Layout</h1>
        {children}
      </div>
    )
  })

// Here we inherit from generalLayout, not from root
export const ideasLayout = generalLayout
  .layout('/idea')
  .layout(({ children }) => {
    return (
      <div>
        <h1>Ideas Layout</h1>
        {children}
      </div>
    )
  })

// Here nothing changes
export const ideaPage = ideasLayout.lets
  .page('/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))
```

Let's also look at how to work with a layout's loaders, and how to get a
layout's data inside the pages themselves. The idea is that a page does not
inherit the layout's queries and loaders themselves, but the layout itself acts
as a provider. And we also know for sure that the page won't be rendered until
the layout's data is loaded. That's why we can use `useValue()` to get the
layout's data inside the pages themselves. I'll say more about `useValue()` and
`getValue()` in the section on providers, which is yet another type of point
available to us

```tsx
export const ideaLayout = root.lets
  .layout('/idea/:id')
  .loader(({ params }) => {
    // essentially the same as .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .layout(({ children }) => {
    return (
      <div>
        <h1>Ideas Layout</h1>
        {children}
      </div>
    )
  })

export const ideaPage = ideaLayout.lets.page('/').page(() => {
  const { idea } = ideaLayout.useValue()
  return (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  )
})
```

Read more in the docs [about layouts](layout).

## Root point

The root is the very first point from which all other points are built. It's
convenient to set in it some settings that all other points need. Also, in the
context of the server, it itself acts as the entry point.

I'll give an example of a real root, and in the comments I'll note what's needed
and why, but I'll cover all the settings in more detail in the corresponding
sections

```tsx
import { Point0 } from '@point0/core'
import { zodSchemaHelper } from '@point0/core/schema/zod'
import { openapi } from '@point0/openapi'
import superjson from 'superjson'

// Unlike all other points, the main root does not inherit from other points, but is created directly from Point0
// By the way, absolutely all points (root, pages, queries, mutations, layouts, providers) are just instances of a single class, Point0
export const root = Point0.lets
  .root()
  // we need the server url so that when calling, for example, ideaViewQuery.fetchQuery({ id: '123' }) we know which origin to send the request to
  .serverUrl(process.env.SERVER_URL)
  // the client url is needed so that when calling ideaViewPage.route.abs({ id: '123' }) we get https://mydomain.com/ideas/123
  .clientUrl(process.env.CLIENT_URL)
  // by analogy with trpc, we can use any transformer. Query input is run through it when sending/receiving,
  // as well as the data returned by the loaders themselves
  .transformer(superjson)
  // we declare schema helpers so that we can produce various things for openapi from the declared input schemas
  // and also for some corner cases in handling search parameters. In short, a very internal thing.
  // But you have to declare it so that Point0 knows which library you're using
  // Moreover, the setting is optional, since everything works through StandardSchema anyway
  // There are also helpers for zod, valibot, yup, arktype, typebox, superstruct
  .schemaHelper(zodSchemaHelper())
  // You can override the error class that the framework throws,
  // it just has to have a structure like ErrorPoint0 or wider (more on the error later in the text)
  .errorClass(AppError)
  // I'll also talk about prefetch later, but the idea is that we can load a page's data before navigating to it,
  // so that at the moment of navigation the page is already fully loaded. Moreover, we have several options for how to do this,
  // in particular here 'pageDehydratedStateAndClientQuery' is used, the most reliable, but computationally expensive one.
  // can be overridden for individual pages
  .prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
  // And you can also load a page on hovering over a link, so that for the user it feels like it loaded faster when navigating to it
  // can be overridden for each individual page, or for each individual link
  .prefetchPageOnLinkHover('pageDehydratedStateAndClientQuery')
  // We can specify default options for all queries, which can be overridden where the queries are created
  // and at the moment they are called
  .queryOptions({
    retry: false,
    retryOnMount: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
  // Here you can subscribe to various events for logging and other purposes, in this case we subscribed to all errors
  // you can subscribe separately to client-side ones via .clientOn() or to server-side ones via .serverOn()
  .on('error', ({ side, name, error, meta, data }) => {
    console.error({
      error,
      // side: client | server
      side,
      // name: the event name
      name,
      // meta: event data suitable for logging
      meta,
      // data: raw data, including for example the response itself,
      // you shouldn't log it, but you can pull out of it what you need
      // data, (don't log)
    })
  })
  // Here you can declare global settings for Unhead
  .head('global', ({ loading, error }) => {
    return {
      ...(loading ? { title: 'Loading...' } : {}),
      ...(error ? { title: error.message } : {}),
      titleTemplate: '%s | My App',
    }
  })
  // The loading state component, which will be shown during the loading of queries/loaders
  // associated with a page/layout/component/provider
  // can be overridden in places
  .loading(() => {
    return <Spinner size="3xl" className="m-auto" />
  })
  // The error state component, which will be shown during the error state of queries/loaders
  .error(({ error }) => {
    return <ErrorPageComponent error={error} />
  })
  // You can specify one separately for components. This also applies to the loading of components
  .componentError(({ error }) => {
    return <ErrorComponent error={error} />
  })
  // Here's exactly the part about the root also acting as the entry point for the server.
  // We'll talk about middleware later. Our code almost doesn't need it, but it's necessary
  // if you want to use third-party middleware like better-auth
  .middleware(
    '/api/auth/*',
    async ({ request }) => await betterAuthServer.handler(request.original),
  )
  // And here you can also configure openapi
  .middleware(
    openapi({
      route: '/openapi.json',
      scalar: '/scalar',
      swagger: '/swagger',
    }),
  )
  // like all points, it ends with the same word it begins with, .root()
  .root()
```

The idea is that, being in any file that contains some point, everything that
affects it can be quickly found through the chain of parents just by clicking in
the code editor. Roughly from a page to a layout, from a layout to the root, and
that's it, no side effects.

And here's how the root declaration looked before the short `.lets` notation was
introduced:

```tsx
// the first argument is the point type, the second is the point name
export const root = Point0.lets('root', 'root')
  // ...
  .root()
// it looked cringe, but it's still valid
```

I'll note that we can have more than one root. This is needed if we want to have
more than one client. For example, we have a server, we have a site, and we have
an Expo app, and we also decided to have the admin panel as a separate client (I
don't do this, it's easier to have the admin panel in the same client as the
site, all the chunks are loaded only where needed anyway). Then you can create
roots from roots:

```tsx
// from this root we'll create all the other roots, and we'll also create purely server-side actions,
// for example webhooks, and reusable queries
export const root = Point0.lets
  .root()
  // here you then don't need to wire in .loading(), .error(), and so on, we'll wire those in for each client's root separately
  // ...
  .root()

// from this root we'll create the site's pages
export const siteRoot = root.lets
  .root()
  // ...
  .root()
```

```tsx
// from this root we'll create the admin panel's pages
export const adminRoot = root.lets
  .root()
  // ...
  .root()
```

```tsx
// expo has its own router, so we won't create pages from it,
// but we can still create components, queries, mutations, providers, and so on
export const expoRoot = root.lets
  .root()
  // ...
  .root()
```

Read more in the docs [about the root](root).

## Base

It's reasonable to assume that since we can declare some common settings for all
points, sometimes we want to declare settings for only part of the points, not
all of them. Then we can create a `base`, and later inherit points from it.

```tsx
export const base = root.lets
  .base()
  .queryOptions({
    retryOnMount: true,
    // any overrides here
  })
  // any overrides of other methods are also possible
  // for example some other loading component
  .loading(() => {
    return <MySpecialSpinner />
  })
  .base()

export const specialPage = base.lets.page('/special').page(() => {
  return <div>Special Page</div>
})
```

But in fact, essentially, it doesn't come in all that handy for me. Because we
have plugins, which I'll talk about later, and they simply let you insert some
methods inside a point's chain, and that's much more convenient.

Read more in the docs [about base](base).

## Loading

Let's figure out when we'll see error states and, most importantly, loading
states on our pages.

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loading(() => {
    return <Spinner size="3xl" className="m-auto" />
  })
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))
```

First, `.loading()` must be declared in the chain (in the page itself, or
somewhere in its parent) before we reach a method that triggers a loading state.
The last `.loading()` component found will be used.

The rule is that the closing `.page()` must necessarily receive already-loaded
data. That's why we'll see the loading state if the data isn't there yet. And
also the error state if an error was received during loading.

Keep in mind that with ssr enabled all the data is already loaded, which means
we won't see a loading state on the initial opening of the page.

When navigating between pages, if we turn off the
`.prefetchPageOnNavigate('none')` setting (in the page itself or in its parent),
then on navigating to the page we'll see the loading state, since we didn't load
the data before the transition.

If we turn on the `.prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')`
setting, then on clicking a link the data (not the html, but the data itself)
and the js chunks of the new page will start loading first, and only then will
the transition happen, and in that case we won't see our .loading() component.

To still give the user some sense that loading is happening when
`.prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')` is enabled, I
suggest using NProgress, for example. And plugging it in somewhere in our
app.tsx:

```tsx
import { useOnNavigate } from '@point0/core/navigation'
import nprogress from 'nprogress'

export const NProgress = () => {
  useOnNavigate(() => {
    // this function is called at the start of navigating to a new page
    const timeout = setTimeout(() => {
      nprogress.start()
      // in case it loads very fast, then we won't show loading
    }, 30)

    return () => {
      // this function is called at the end of navigating to a new page
      clearTimeout(timeout)
      nprogress.done()
    }
  })

  return null
}
```

Read more in the docs [about loading and errors](loading-error).

## Many Queries

You can stick more than one query into a single page:

```tsx
export const ideaBestQuery = root.lets
  .query()
  .loader(async () => {
    const bestIdea = await prisma.idea.findFirst({
      orderBy: {
        rating: 'desc',
      },
    })
    return { bestIdea }
  })
  .query()

export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(ideaBestQuery)
  .page(
    ({
      // the first declared query lands in data
      data: { idea },
      // but when working with many queries this isn't enough, so it's easier to grab the query you need
      // via queries, where the already-loaded typed queries are stored in an array in the order they were declared
      queries: [ideaViewQueryResult, ideaBestQueryResult],
    }) => (
      <div>
        <h1>{ideaViewQueryResult.data.idea.title}</h1>
        <div>{ideaViewQueryResult.data.idea.content}</div>
        <hr />
        <h2>Best Idea</h2>
        <div>{ideaBestQueryResult.data.bestIdea.title}</div>
      </div>
    ),
  )
```

The rule here is that all queries declared in `.with()` are called in parallel
by default, and we see the loading state until they have all loaded. As for the
error, we'll see the first one encountered.

When more than one query is used, you really want to bring the data into a
normalized shape before rendering the page; for that we have `.mapper()`:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(ideaBestQuery)
  .mapper(({ queries: [ideaViewQueryResult, ideaBestQueryResult] }) => ({
    idea: ideaViewQueryResult.data.idea,
    bestIdea: ideaBestQueryResult.data.bestIdea,
  }))
  .page(
    ({
      // data now contains everything we returned from the mapper
      data: { idea, bestIdea },
    }) => (
      <div>
        <h1>{idea.title}</h1>
        <div>{idea.content}</div>
        <hr />
        <h2>Best Idea</h2>
        <div>{bestIdea.title}</div>
      </div>
    ),
  )
```

Read more in the docs [about .with()](with), [about the mapper](mapper).

## .with()

- What do we do if we need to use data from one query as the input for another
  query?
- Or what if we even need to get the data for a query's input from some external
  hook entirely?
- Or we want to react to the status of each individual query up until the moment
  they have successfully loaded?

This is exactly where the capabilities of `.with()` that we haven't looked at
before come in handy.

### .with() as a query injector

Let's go through injecting a single query into a page:

```tsx
// we've already seen this, and it's convenient to do it exactly this way
export const prev_ideaPage = root.lets
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

// but the same thing can be written like this
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ params }) => {
    // each .with() mimics wrapping a component, on top of the component,
    // so we can freely use any hooks here
    // but it's specifically by returning the result of useQuery() that we get data and queries in the subsequent methods
    return ideaViewQuery.useQuery({ id: params.id })
  })
  // from here on no changes, everything is the same as in prev_ideaPage
  .page(({ data: { idea }, queries: [ideaViewQueryResult] }) => (
    <h1>{idea.title}</h1>
  ))
```

Let's go through injecting several queries into a page:

```tsx
// we've already seen this, and it's convenient to do it exactly this way
export const prev_ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(ideaBestQuery)
  .page(({ queries: [ideaViewQueryResult, ideaBestQueryResult] }) => (
    <h1>{idea.title}</h1>
  ))

// but the same thing can be written like this
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ params }) => {
    // you can return an array of queries right out of a single .with()
    return [ideaViewQuery.useQuery({ id: params.id }), ideaBestQuery.useQuery()]
  })
  // from here on no changes, everything is the same as in prev_ideaPage
  .page(({ queries: [ideaViewQueryResult, ideaBestQueryResult] }) => (
    <h1>{ideaViewQueryResult.data.idea.title}</h1>
    <h2>{ideaBestQueryResult.data.bestIdea.title}</h2>
  ))
```

Now let's go through the first way of using data from one query as input for
another query:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ params }) => {
    const ideaViewQueryResult = ideaViewQuery.useQuery({ id: params.id })
    // suppose ideaViewQueryResult.data.idea.similarIds holds the ids of similar ideas
    const ideaListQueryResult = ideaListQuery.useQuery(
      // the first argument is the input as usual,
      // but this isn't very convenient, because our input probably expects ids strictly as an array,
      // and not an array or undefined, and then we'd have to tack on as never
      // which is just awful, and that's why another way exists, which I'll cover later in the article
      { ids: ideaViewQueryResult.data?.idea.similarIds } as never,
      // in the second argument we can pass the classic useQuery options from react-query
      // and we simply say not to enable the query until ideaViewQueryResult has loaded
      { enabled: !!ideaViewQueryResult.data },
    )
    return [ideaViewQueryResult, ideaListQueryResult]
  })
  // a disabled query's real status is still pending, so we won't get this far,
  // until ideaViewQueryResult has loaded
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title} </h1>
      <h2>Similar ideas</h2>
      <ul>
        {ideaListQueryResult.data.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

But I don't really like these tricks with `enabled`, and it's kind of clunky
anyway, so there's another way that I like better; more on that in the upcoming
`.with()` sections.

### .with() as a state manager

Here's the new part:

```tsx
export const strangePage = root.lets
  .page('/strange')
  .with(({ LoadingComponent, ErrorComponent }) => {
    // LoadingComponent holds what we previously declared in the .loading() method
    // ErrorComponent holds what we previously declared in the .error() method
    const [isLoading, setIsLoading] = useState(true)
    const error = useState(() =>
      Math.random() > 0.5 ? new Error('How wrong I was') : undefined,
    )

    useEffect(() => {
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }, [])

    if (isLoading) {
      return <LoadingComponent />
    }

    if (error) {
      return <ErrorComponent error={error} />
    }

    // return undefined
    // or just return nothing, which means we render the following methods
  })
  // we won't reach the render until all the .with() are resolved
  .page(() => (
    <h1>I was loading something, I don't know what, but I pulled it off</h1>
  ))
```

Let's go through one more example with a different notation that I like better:

```tsx
export const strangePage = root.lets
  .page('/strange')
  .with(() => {
    const [isLoading, setIsLoading] = useState(true)
    const error = useState(() =>
      Math.random() > 0.5 ? new Error('How wrong I was') : undefined,
    )

    useEffect(() => {
      setTimeout(() => {
        setIsLoading(false)
      }, 1000)
    }, [])

    if (isLoading) {
      // you can just return the reserved word 'loading'
      // this is the same as return <LoadingComponent />
      return 'loading'
    }

    if (error) {
      // you can just return any object that is instanceof Error
      // this is the same as return <ErrorComponent error={error} />
      return error
    }

    // return undefined
    // or just return nothing, which means we render the following methods
  })
  .page(() => (
    <h1>I was loading something, I don't know what, but I pulled it off</h1>
  ))
```

### .with() as a props injector

Suppose in one `.with()` hook we got some computation result, and we want to use
it in another `.with()` hook, or on the page itself. Then we can pass props down
through the point's methods.

```tsx
export const strangePage = root.lets
  .page('/')
  .with(() => {
    // if we returned something that isn't a react element, isn't instanceof Error, isn't the word 'loading', isn't a query result,
    // then it means we returned props, which will be available in the point's following methods
    return {
      x: 1,
      y: 2,
    }
  })
  .with(({ props: { x, y } }) => {
    return {
      a: x * 10,
      b: y * 100,
      // props can be overwritten, even with a different type
      // as a result we'll still see the types we need in the point's following methods
      // because in essence this is nextProps = {...prevProps, ...newProps}
      x: 'I decided I'll be a string',
    }
  })
  .page(({ props: { a, b, x, y } }) => (
    <h1>
      {a} {b} {x} {y}
    </h1>
  ))
```

### .with() as a wrapper

The `.with()` method's props also include `children`, and you can essentially
wrap whatever the following `.with()` and the `.page()` itself return in any
construct:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ children }) => {
    return <div style={{ border: '1px solid red' }}>{children}</div>
  })
  .page(() => <div id="page">Hello!</div>)
```

### .with() as an idea

In short, I don't know how to put briefly what I wanted to do, so I'll show it
in a few steps. At first it'll look like nonsense, but then it'll turn out
nicely. This is what I arrived at in the process of building a real project on
the framework, and it becomes convenient once you're writing not your first
page, or using more complex real-world constructs, which especially come into
their own once we get to plugins in the upcoming section.

Let's now apply what we've learned to look at another way we can use `.with()`
to use data from one query in the input of another query:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(({ queries: [ideaViewQueryResult] }) => {
    // unlike .page(), all .with() receive the queries in an undetermined state,
    // that is, there could be an error here, a loading state, or the query result
    // and we can handle them however we want

    if (ideaViewQueryResult.isError) {
      // covered in the .with() as a state manager section
      return ideaViewQueryResult.error
    }

    if (ideaViewQueryResult.isLoading) {
      // covered in the .with() as a state manager section
      return 'loading'
    }

    // covered in the .with() as a props injector section
    return { similarIds: ideaViewQueryResult.data.idea.similarIds }
  })
  // we won't reach this .with() while the previous one was intercepting control via a return
  .with(ideaListQuery, ({ props: { similarIds } }) => ({ ids: similarIds }))
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title} </h1>
      <h2>Similar ideas</h2>
      <ul>
        {ideaListQueryResult.data.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

But again, I don't like all this manual management of query states, so a special
helper `resolve()` was created. It takes a query result as input; while the
query is loading or erroring, it returns the loading or error component, and
after success it maps its data onto props that will be passed further down. So
the same thing as in the example above we can implement like this:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .with(({ queries: [ideaViewQueryResult], resolve }) => {
    // this is the same as in the example above but short
    return resolve(ideaViewQueryResult, ({ data }) => ({
      similarIds: data.idea.similarIds,
    }))
  })
  .with(ideaListQuery, ({ props: { similarIds } }) => ({ ids: similarIds }))
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title} </h1>
      <h2>Similar ideas</h2>
      <ul>
        {ideaListQueryResult.data.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

But again, it's clunky. And as practice has shown, resolving before continuing
can be needed often, so an even shorter notation was added that bakes the
resolve functionality right into the query injection itself:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(
    ideaViewQuery,
    ({ params }) => ({ id: params.id }),
    // there could be options for useQuery here, but we don't need them here
    undefined,
    ({ data }) => ({
      similarIds: data.idea.similarIds,
    }),
  )
  .with(ideaListQuery, ({ props: { similarIds } }) => ({ ids: similarIds }))
  .page(({ queries: [ideaViewQueryResult, ideaListQueryResult] }) => (
    <div>
      <h1>{ideaViewQueryResult.data.idea.title} </h1>
      <h2>Similar ideas</h2>
      <ul>
        {ideaListQueryResult.data.ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

This `resolve()` can also help when we want to call a query but don't want it to
land in the queries array, or in data itself. This is sometimes needed when, for
example, we want to use the current user's data on the page — data we requested
via a query somewhere in the previous points, that is essentially first — but we
want to store it in props, not in data. Because in data we want to have the
page's own data:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(({ resolve }) => {
    // since we didn't return the result of useQuery from this .with()
    // it means it won't land in the queries array, nor in data
    // but thanks to resolve() we can get its data into props
    return resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me }))
  })
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea }, props: { me } }) => (
    <div>
      <h1>{idea.title} </h1>
      <p>Hello, {me.name}!</p>
    </div>
  ))
```

Read more in the docs [about .with()](with).

## Context

For a single page, query, component, and other points that can have a loader, we
can declare only 1 loader. But what should we do if we want to have some shared
server logic across different points? Let's say we want only authorized users to
be able to see a page or request a query/mutation.

```tsx
// let's say you have some helper that lets you get the current user from the request
// via headers or however you like, we'll talk more about authorization later
import { getMe } from '@/lib/auth'

export const ideaPage = root.lets
  .page('/ideas/:id')
  .ctx(({ request }) => {
    const me = await getMe(request)
    if (!me) {
      throw new Error('Unauthorized')
    }
    // whatever we return from .ctx() ends up in ctx in the subsequent .loader() and .ctx()
    // nextCtx = {...prevCtx, ...newCtx}
    return { me }
  })
  // we can have as many .ctx() as we want
  // but only one .loader() per point
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
    </div>
  ))
```

We could perfectly well call `await getMe(request)` right inside the loader body
itself, but the idea is that you will most likely have this `.ctx()` somewhere
in a parent point, or inject it through plugins (I'll talk about them in the
next section). But for now let's imagine you have a `base` for points that
require authorization, then it would look like this:

```tsx
import { getMe } from '@/lib/auth'

export const authorizedBase = root.lets
  .base()
  .ctx(({ request }) => {
    const me = await getMe(request)
    if (!me) {
      throw new Error('Unauthorized')
    }
    return { me }
  })
  .base()

export const ideaPage = authorizedBase.lets
  .page('/ideas/:id')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
    </div>
  ))
```

It's very important to note that `.ctx()` will only be called if the page has a
`.loader()`. No `.loader()` means there's no request at all, so the code in
`.ctx()` won't be called either.

But as practice has shown, this `base` is not nearly as convenient as plugins,
so let's study plugins.

Read more in the docs [about context](ctx).

## Plugin

A plugin lets you define a set of methods that we can inject into a point's
chain.

```tsx
import { getMe } from '@/lib/auth'

export const authorizedPlugin = Point0.lets
  .plugin()
  .ctx(({ request }) => {
    const me = await getMe(request)
    if (!me) {
      throw new Error('Unauthorized')
    }
    return { me }
  })
  .plugin()

export const ideaPage = root.lets
  .page('/ideas/:id')
  .use(authorizedPlugin)
  .loader(async ({ ctx: { me }, params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
    </div>
  ))
```

All other points except the plugin must be exported as-is, and we can't create
them dynamically, so that we can analyze them statically (this is needed by the
compiler, which I'll cover later). But the plugin we can wrap in a function, for
example:

```tsx
import { getMe } from '@/lib/auth'

export const authorizedPlugin = ({
  permsission,
}: { permsission?: string } = {}) =>
  Point0.lets
    .plugin()
    .ctx(({ request }) => {
      const me = await getMe(request)
      if (!me) {
        throw new Error('Unauthorized')
      }
      if (permsission && !me.permissions.includes(permsission)) {
        throw new Error('Forbidden')
      }
      return { me }
    })
    .plugin()

export const ideaPage = root.lets
  .page('/ideas/:id')
  .use(authorizedPlugin({ permissions: ['ideaRead'] }))
  .loader(async ({ ctx: { me }, params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
    </div>
  ))
```

In other words, plugins are not something other developers write and you use —
it's specifically a tool for your own code, to organize it more conveniently.

In practice, for an authorization plugin it's better to have a combination of
`.ctx()` and `.with()` right away:

```tsx
import { getMe } from '@/lib/auth'

export const getMeQuery = root.lets
  .query()
  .loader(async ({ request }) => {
    return { me: await getMe(request) }
  })
  .query({
    staleTime: Infinity,
  })

export const authorizedPlugin = Point0.lets
  .plugin()
  // ctx is a purely server-side thing, it gets stripped out on the client,
  // so you can only see its value in other .ctx() and .loader()
  .ctx(({ request }) => {
    const me = await getMe(request)
    if (!me) {
      throw new Error('Unauthorized')
    }
    return { me }
  })
  // .with() is a thing that works during component render, both on the client
  // and on the server if ssr is enabled, but that's why we don't see ctx here, so the client doesn't break
  .with(({ resolve }) => {
    return resolve(getMeQuery.useQuery(), ({ data }) => ({ me: data.me }))
  })
  .plugin()

export const ideaPage = root.lets
  .page('/ideas/:id')
  // for this page, only what we have in the plugin and .ctx() matters
  // .ctx() let the loader get me, and if the user isn't authorized, we'll see the error anyway
  // as a query-call error, so here .with() was essentially unnecessary, but it'll come in handy elsewhere
  .use(authorizedPlugin)
  .loader(async ({ ctx: { me }, params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
    </div>
  ))

export const introPage = root.lets
  .page('/intro')
  // and here's a page with no loader at all. When navigating to it from another page, we don't need a server request at all,
  // because no query and no loader is bound to it (and a loader is also just a way to declare a query).
  // Which means the code inside .ctx() won't be called either.
  // But we have a .with() inside the plugin here, and that's exactly what prevents viewing this page
  .use(authorizedPlugin)
  // It's important to understand that static content can still be obtained by anyone, because it gets bundled together with the client.
  // So all real data that should only be available to authorized users, we must return from the server
  // in .loader()
  .page(({ data: { idea } }) => (
    <div>
      <h1>Authorized only</h1>
    </div>
  ))

export const ideaQuery = root.lets
  .query()
  .use(authorizedPlugin)
  // and a query has nothing to do with render at all, so .with() will be ignored here entirely
  // but .ctx() will be used
  .loader(async ({ ctx: { me }, params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .query()
```

You can create as many plugins as you want, and insert as many `.use()`
constructs as you want.

Plugins can even be inserted into one another. For example, there's a plugin
that adds the current user to the server context. But it doesn't check whether
the user is authorized or not. And you can have another plugin that forbids
unauthorized users from viewing a page, which uses the previous plugin:

```tsx
export const mePlugin = Point0.lets
  .plugin()
  .ctx(({ request }) => {
    const me = await getMe(request) // user | undefined
    return { me }
  })
  .plugin()

export const authorizedPlugin = Point0.lets
  .plugin()
  .use(mePlugin)
  .ctx(({ ctx: { me } }) => {
    if (!me) {
      throw new Error('Unauthorized')
    }
  })
  .plugin()
```

Read more in the docs [about plugins](plugin).

## Mountables

So far we have talked only about pages and layouts as points that can render
something. We also have components and providers. All four of these entities:
`page`, `layout`, `component`, `provider` — are called mountables. That is, all
of them can be mounted into the React tree. And `.loader()`, `.mapper()`,
`.with()`, `.use()`, and so on apply to all of them, meaning they all work on
the same principle, and once you understand how one of them works, you will
understand how the rest work too.

The cardinal difference is that pages and layouts are quite easy to declare —
just don't forget to export them. They will be collected by the generator on
their own, to build the `points.ts` file where they are listed, so that both the
client and the server know about their existence (more on the generator later).

Components and providers, however, once declared, we have to use somewhere
ourselves. Let's study them.

Read more in the docs [about mountables](mountable).

## Component

We have talked a lot about how to plug several queries into a single page. But
in fact this isn't needed all that often. Most of the time different parts of a
page need different data, and we don't need to try to gather all the data in the
page itself — it's easier to let components load the data they need on their
own.

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <SimilarIdeas input={{ ids: idea.similarIds }} />
    </div>
  ))

export const SimilarIdeas = root.lets
  .component()
  .input(z.object({ ids: z.array(z.string()) }))
  .loader(async ({ input: { ids } }) => {
    const ideas = await prisma.idea.findMany({ where: { id: { in: ids } } })
    return { ideas }
  })
  .component(({ data: { ideas } }) => (
    <div>
      <h2>Similar ideas</h2>
      <ul>
        {ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

As we can see, with a component, just like with an ordinary query, we can pass
an input schema and a loader, and the component itself likewise becomes a query,
so it still has the methods (just like a page or a layout that has declared its
own loader):

```tsx
SimilarIdeas.useQuery(input, ...)
SimilarIdeas.getQueryKey(input, ...)
SimilarIdeas.getQueryOptions(...)
SimilarIdeas.fetchQuery(...)
SimilarIdeas.prefetchQuery(...)
SimilarIdeas.getQueryData(...)
SimilarIdeas.ensureQueryData(...)
SimilarIdeas.refetchQuery(...)
SimilarIdeas.setQueryData(...)
SimilarIdeas.getQueryCache(...)
SimilarIdeas.getQueriesCache(...)
SimilarIdeas.getQueryState(...)
SimilarIdeas.cancelQuery(...)
SimilarIdeas.invalidateQuery(...)
SimilarIdeas.removeQuery(...)
SimilarIdeas.resetQuery(...)
```

Like all mountables, in a component we can use `.with()`, and everything that
was possible in pages and layouts can be done here too.

It should be noted that `.input()` is a construct for the server, and therefore
inside the component's render we don't see the input, since it wasn't validated
on the client, which means we can't guarantee that it's valid and that its type
matches. For this you need to use either `.sharedInput()`, or, if you just want
some props, then declare them as the component's input props. I'll tell you
about `.sharedInput()` later, and about input props right now:

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <SimilarIdeas ids={idea.similarIds} />
    </div>
  ))

export const SimilarIdeas = root.lets
  // here we just passed in whatever input-props type we wanted, and that's it
  .component<{ ids: string[] }>()
  // here we extracted them and passed them into the query
  .with(ideaListQuery, ({ props: { ids } }) => ({ ids }))
  .component(({ data: { ideas } }) => (
    <div>
      <h2>Similar ideas</h2>
      <ul>
        {ideas.map((idea) => (
          <li key={idea.id}>{idea.title}</li>
        ))}
      </ul>
    </div>
  ))
```

Absolutely the same code in terms of the result, but a different approach. Once
again I'll note that it's actually more convenient to store queries separately
rather than declaring loaders in the mountables themselves.

Read more in the docs [about components](component).

## Provider

I used to like requesting the user in a separate provider, so that I could then
get it anywhere in the app. And so I thought it would be good for us to have a
provider in the framework right away, which, like all mountables, can request
any data — either on its own or through a query — and then hand it out to all of
its children.

```tsx
export const MeProvider = root.lets
  .provider()
  .loader(async ({ request }) => {
    return { me: await getMe(request) }
  })
  .provider()

// Somewhere inside app.tsx
export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MeProvider>
        <Router />
      </MeProvider>
    </QueryClientProvider>
  )
}

// Somewhere in some component
export const UserInfo = () => {
  const { me } = MeProvider.useValue()
  return <div>Hello, {me.name}!</div>
}
```

That is, by default a provider returns whatever is in its data. But in a
situation where our provider called several queries, or didn't call a query at
all but instead called some hooks, we'd want to put the data in order.

```tsx
export const MeProvider = root.lets
  .provider()
  .with(() => {
    const x = useSomethingSpecial()
    return { x }
  })
  .with(getMeQuery)
  // this is the same as .mapper(), it's just convenient to describe it in the final .provider() method
  .provider(({ data: { me }, props: { x } }) => ({ me, x }))

export const UserInfo = () => {
  const { me, x } = MeProvider.useValue()
  return (
    <div>
      Hello, {me.name}! You are {x}!
    </div>
  )
}
```

But honestly, I realized that all these providers aren't really that necessary,
because, for example, it's easier to insert the user specifically through a
plugin. Because all data are query results anyway, and queries are cached. And
we don't get any extra re-renders. But nevertheless we do have providers, in
case they come in handy.

Read more in the docs [about providers](provider).

## Infinite Query

Let's go over how Infinite Queries work. In essence, the same as ordinary
queries, but there are some specifics in passing the parameter responsible for
the identifier of the next `page` (`page` as in infiniteQuery, not our page):

```tsx
export const ideaListQuery = root.lets
  .infiniteQuery()
  .input(
    z.object({
      page: z.number().default(0),
      limit: z.number().default(2),
    }),
  )
  .loader(async ({ input: { page, limit } }) => {
    const ideasCount = await prisma.idea.count()
    const ideas = await prisma.idea.findMany({
      take: limit,
      skip: page * limit,
      orderBy: { updatedAt: 'desc' },
    })
    const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
    return { ideas, ideasCount, nextCursor }
  })
  .infiniteQuery({
    // in ordinary queries, here we could pass nothing
    // here we can pass any of react-query's native useInfiniteQuery settings
    // but most importantly our custom "pageParamFromInput"
    // this is the key (path) in the input to the value that will be used as pageParam
    pageParamFromInput: 'page',
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  })

export const ideaListPage = generalLayout.lets
  .page('/ideas')
  // since all of ideaListQuery's input keys are optional, we can pass nothing as the second argument
  .with(ideaListQuery)
  .mapper(({ data }) => {
    // data here is an ordinary object obtained from useInfiniteQuery
    // there's nothing custom here, it's just convenient to organize our data in the mapper
    return {
      ideas: data.pages.flatMap((page) => page.ideas),
      total: data.pages[0].ideasCount,
    }
  })
  .head(({ data: { total } }) => {
    return `${total} ideas`
  })
  .page(({ data: { ideas, total }, queries: [query] }) => {
    return (
      <div>
        <h1>Ideas</h1>
        <div>
          {ideas.map((idea) => (
            <h2 key={idea.id}>{idea.title}</h2>
          ))}
        </div>
        {query.hasNextPage && (
          <button
            disabled={query.isFetchingNextPage}
            onClick={() => {
              query.fetchNextPage().catch(console.error)
            }}
          >
            {query.isFetchingNextPage ? 'Loading more...' : 'Load more'}
          </button>
        )}
      </div>
    )
  })
```

We can also use `.infiniteQuery()` baked right into the page, using its loader.
That is, the very same code could have been written in the following way as
well. However, keep in mind that a page doesn't have an "input" — instead a page
has the route `params`, and it can also have search params, which I'll show you
right now:

```tsx
export const ideaListPage = root.lets
  .page('/ideas')
  .search(
    z.object({
      page: z.coerce.number<number | string>().default(0),
      limit: z.coerce.number<number | string>().default(2),
    }),
  )
  .loader(async ({ search: { page, limit } }) => {
    const ideasCount = await prisma.idea.count()
    const ideas = await prisma.idea.findMany({
      take: limit,
      skip: page * limit,
      orderBy: { updatedAt: 'desc' },
    })
    const nextCursor = ideasCount > (page + 1) * limit ? page + 1 : undefined
    return { ideas, ideasCount, nextCursor }
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
    // here the construct '?.page' means we take it from the search params
    pageParamFromInput: '?.page',
  })
  // from here on everything is the same, unchanged
  .mapper(({ data }) => {
    return {
      ideas: data.pages.flatMap((page) => page.ideas),
      total: data.pages[0].ideasCount,
    }
  })
  .head(({ data: { total } }) => {
    return `${total} ideas`
  })
  .page(({ data: { ideas, total }, queries: [query] }) => {
    return (
      <div>
        <h1>Ideas</h1>
        <div>
          {ideas.map((idea) => (
            <h2 key={idea.id}>{idea.title}</h2>
          ))}
        </div>
        {query.hasNextPage && (
          <button
            disabled={query.isFetchingNextPage}
            onClick={() => {
              query.fetchNextPage().catch(console.error)
            }}
          >
            {query.isFetchingNextPage ? 'Loading more...' : 'Load more'}
          </button>
        )}
      </div>
    )
  })
```

Read more in the docs [about infinite queries](infinite-query).

## clientLoader(), clientInput(), sharedInput()

In Point0 you can also make purely client-side queries, loaders, and mutations.
Everything works exactly the same way, and all the rules are exactly the same as
for regular points, but such queries won't be processed during SSR — the body of
the `loader` function is called right on the client at the moment of the
request. Here's an example of a page:

```tsx
export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .clientLoader(({ params }) => {
    const idea = await fetch(`https://example.com/ideas/${params.id}`).then(
      (res) => res.json(),
    )
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
    </div>
  ))
```

Here's an example of a query:

```tsx
export const ideaQuery = root.lets
  .query()
  .clientInput(z.object({ id: z.string().min(1) }))
  .clientLoader(({ params }) => {
    const idea = await fetch(`https://example.com/ideas/${params.id}`).then(
      (res) => res.json(),
    )
    return { idea }
  })
  .query()
```

Read more in the docs [about loaders](loader), [about validation](validation).

## Location

Inside pages, layouts, and loaders we get a typed `location` object. In a
loader, as we've already seen, most often we need not the whole `location`, but
two of its typed parts — `params` (from the route path) and `search` (from the
query string); however, you can also get the original `location` object there.

`location.search` is stored unvalidated, and unlike the standard
`location.search` it's an object, not a string, and the object may not even be
flat. The string is there too, but it lives in `location.searchString`. The
object in `search` will be non-flat in the case where you navigate to a page via
a qs-style URL: http://example.com/ideas/42?a=1&b=2&c.x=3&c.y=4&d[]=5&d[]=6.

```tsx
export const ideaPage = root.lets
  .page('/ideas/:id')
  .loader(async ({ location }) => {
    console.log(location.search)
    // { a: '1', b: '2', 'c': { x: '3', y: '4' }, 'd': [ '5', '6' ] }
    return { idea: 'Fake idea' }
  })
  .page(
    ({
      data: { idea },
      // here you can also get location
      location,
    }) => <h1>{idea}</h1>,
  )
```

You can also get `location` by calling `useLocation()` anywhere in the code
inside the router (I'll talk about the router soon):

```tsx
import { useLocation } from '@point0/core/navigation'

export const Breadcrumbs = () => {
  const location = useLocation()
  // location.pathname    — path without query and hash: "/ideas/42"
  // location.search      — typed object of query params: { tab: 'news' }
  // location.searchString — raw query string: "tab=news"
  // location.hash        — anchor: "#comments" (or empty)
  // location.hrefRel     — relative url: "/ideas/42?tab=news#comments"
  // location.href        — absolute url, if the origin is known
  return <div>{location.pathname}</div>
}
```

`useLocation()` is reactive — the component re-renders itself on navigation. If
you need `location` outside React (in some helper), there's the imperative
`getLocation()`.

Read more in the docs [about navigation](navigation).

## Route

I'll talk about the generator later, but you need to understand that it can
generate for us a file like this with routes, based on the pages we've declared
ourselves in our project — which are themselves typed simply by the look of
their own string: `/ideas/:id`, `/ideas/:id/edit`, and so on. Let's put it, say,
into the file `src/generated/point0/routes.ts`:

```tsx
import { Routes } from '@1gr14/route0'

export const routes = Routes.create({
  home: '/',
  about: '/about',
  ideaList: '/ideas',
  ideaCreate: '/ideas/new',
  ideaView: '/ideas/:id',
  ideaUpdate: '/ideas/:id/edit',
})
```

This is handled by the [`@1gr14/route0`](https://1gr14.dev/route0) library,
which is not a router — it's just a thing for managing string paths in an
application. It can be used anywhere outside of Point0.

With these routes we can work like this:

```tsx
routes.ideaView({ id: '123' }) // "/ideas/123"
routes.ideaView.abs({ id: '123' }) // "https://example.com/ideas/123"
```

The library itself can do a lot — it can validate parameters and so on — but
that's used under the hood of Point0, and when building a project we just need
it to derive paths.

Read more in the docs [about navigation](navigation).

## Router and Navigation

What I wanted from navigation:

- That I'd have an object with all the paths in the application, which I could
  maintain myself, or generate automatically
- That I wouldn't have to declare all the pages myself inside app.tsx or
  wherever else and combine them with layouts — after all, it's obvious even to
  a child from the paths of the pages themselves how they should be laid out
  there
- That I could navigate not only by a concrete path, which would be agonizing to
  replace during refactoring, but by the name of a page-point, with typed
  parameters
- That the first visit to a page would be SSR, so we immediately get a ready
  page, and subsequent page transitions would be SPA-style, loading the minimum
  amount of data

We need to declare a file ourselves that will contain all our helpers for
organizing routing — they'll all be typed thanks to the `routes` passed into
`createNavigation`. Let's put this file in `src/lib/navigation.ts`:

```tsx
import { createNavigation } from '@point0/react-dom/router'
import {
  // you can use any wouter hooks you like
  navigate as browserNavigate,
  useBrowserLocation as hook,
} from 'wouter/use-browser-location'
import { routes } from '@/generated/point0/routes'

export const {
  navigate,
  Link,
  NavLink,
  Redirect,
  redirect,
  Router,
  RouterRoutes,
} = createNavigation({
  routes,
  navigate: browserNavigate,
  hook,
})
```

Now we need to put `Router`/`RouterRoutes` into our `app.client.tsx`. I'll talk
about the structure of `app.client.tsx` later, for now as is:

```tsx
import { Router, RouterRoutes } from '@/lib/navigation'
import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { Head } from '@unhead/react'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UnheadProvider>
        <Head>
          <link rel="shortcut icon" href="/favicon.ico" />
        </Head>
        <Router>
          {/* Here we already have the router context, that is, here we can call the useLocation() hook and others */}
          <RouterRoutes />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
```

Now we can navigate programmatically in place:

```tsx
// by page name with typed input
await navigate('idea', { id: '123' })

// you can pass wouter's own options
await navigate('idea', { id: '123' }, { replace: true })

// as well as options related to prefetching,
// for example if everywhere we used .prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')
// here you can override it
await navigate('idea', { id: '123' }, { prefetch: 'none' })

// and scrollToHash also works on its own, but you can override its policy
await navigate(
  'idea',
  // to specify what comes after # in the url, just add '#': value
  { id: '123', '#': 'comments' },
  // this is already the default policy: if the hash is on this page we scroll smoothly,
  // and when navigating to a new one, we land in place right away
  { scrollToHash: 'pushHardCurrentSmooth' },
)

// you can also pass search params:
await navigate(
  'ideas',
  // to specify what comes after ? in the url, just add '?': object
  { '?': { filter: 'fresh', sort: 'desc' } },
)

// And we can specify right away that we need this page in a new tab:
await navigate('idea', { id: '123' }, { newTab: true })

// and you can also navigate by raw url, if you really need to
await navigate.to('/ideas/123?tab=news')

// and the classics
navigate.back()
navigate.forward()
```

Links work on the same principle as programmatic navigation, only instead of
`navigate` you use `Link`:

```tsx
import { Link } from '@/lib/navigation'

// a regular typed link
<Link route="idea" input={{ id: '123' }}>Open idea</Link>

// you can use a url
<Link to="/ideas/123">Open idea</Link>

// an external link — leaves the SPA like a regular <a>
// the prefetch and navigation hooks won't be called
<Link href="https://example.com">Outward</Link>

// on hover you can prefetch precisely this link (overrides the route setting)
<Link route="idea" input={{ id: '123' }} prefetchOnHover="serverAndClientQuery">
  Open idea
</Link>
```

`NavLink` is the same link, but it knows whether it's currently active, and can
provide different classes for different states (exact match, parent of the
current path, descendant, etc.):

```tsx
<NavLink
  route="home"
  className="px-3 py-1.5 text-slate-700 hover:bg-slate-100"
  // when we're already on this page — suppress clicks and highlight
  exactClassName="pointer-events-none text-slate-300"
>
  Home
</NavLink>
```

And you can also pass classes into it as an object like this:

```tsx
<NavLink
  route="home"
  className={{
    default: 'px-3 py-1.5 text-slate-700 hover:bg-slate-100',
    exact: 'pointer-events-none text-slate-300',
  }}
>
  Home
</NavLink>
```

There's also a couple of hooks for reacting to transitions. `useOnNavigate()` I
already showed in the section on loading (there we hung NProgress on it). And
`useIsNavigating()` simply tells you whether a transition is currently in
progress — handy, for example, to dim the content while the next page loads:

```tsx
import { useIsNavigating } from '@point0/core/navigation'

export const generalLayout = root.lets.layout().layout(({ children }) => {
  const isNavigating = useIsNavigating()
  return <div style={{ opacity: isNavigating ? 0.6 : 1 }}>{children}</div>
})
```

We also have an `index.client.ts` file, which is exactly what feeds in our
points (it's just an array of our points with lazy import, which the generator
assembled for us), thanks to which `RouterRoutes` itself knows about all
existing points. And it can build the tree. It sorts by routes from more
specific to less specific. That is, we can have a page '/ideas/new' and
'/ideas/:id' and they won't conflict

```tsx
import App from '@/app.client'
import points from '@/generated/point0/points.client'
import '@/styles/index.css'
import { ErrorBoundary } from '@/ui/error-boundary'
import { mount } from '@point0/react-dom/mount'

mount(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  points,
)
```

Read more in the docs [about navigation](navigation).

## Redirect

A redirect is a close relative of navigation, only we don't click ourselves — we
redirect the user based on some condition. And there are two sides here: the
client and the server.

On the client everything is obvious — it's just navigation based on a condition.
You can do it imperatively via `navigate(...)`, or declaratively — by rendering
the `Redirect` component:

```tsx
import { Redirect } from '@/lib/navigation'

export const secretPage = root.lets.page('/secret').page(() => {
  const { me } = MeProvider.useValue()
  if (!me) {
    // rendered it — means we redirect, works under SSR too
    return <Redirect route="login" />
  }
  return <h1>Secret page</h1>
})
```

On the server (in `.loader()` or `.ctx()`) we simply have to return or throw
redirect()

```tsx
import { redirect } from '@/lib/navigation'
import { AppError } from '@/lib/error'

export const redirectUnauthorizedPlugin = Point0.lets
  .plugin()
  .ctx(({ request }) => {
    const me = await getMe(request)
    if (!me) {
      throw redirect('login')
      // return redirect('login') is also ok
    }
    return { me }
  })
  .plugin()
```

This same redirect helper we can use in `.with()`:

```tsx
export const redirectUnauthorizedPlugin = Point0.lets
  .plugin()
  .use(mePlugin)
  .with(({ props: { me } }) => {
    if (!me) {
      // here you don't need to throw, this is sort of a react component
      // in react components we don't throw anything, we just return
      return redirect('login')
      // return <Redirect route="login" /> is also ok
    }
  })
  .plugin()
```

## .middleware()

What is the foundation in other frameworks is an antipattern for us. For our
points, middleware isn't needed — we have loaders and ctx. But there are
situations where middleware is exactly what you need: CORS, third-party
libraries, integrations. Usually we insert middleware into the root itself, then
absolutely all requests to the server pass through them. In special cases you
can insert it into the points themselves, then when requesting that point its
middleware will be added to the rest.

They work the same way as middleware in Express and in other frameworks:

```tsx
// for example, we want to measure the request execution time
const root = Point0.lets
  .root()
  .middleware(async ({ next }) => {
    const startedAt = performance.now()
    const result = await next()
    const duration = performance.now() - startedAt
    console.log(`Request took ${duration}ms`)
    return result
  })
  .root()

// we can stop the chain and return our own response
// this is infinitely destructive, don't do this, but the idea is clear
// in this case we'll break all our points
const root = Point0.lets
  .root()
  .middleware(async ({ next }) => {
    return new Response('Hello, world!', { status: 200 })
  })
  .root()
```

An interesting difference of our middleware is that `next()` returns not a
Response, it returns a special object. That is, the middleware is obligated to
either return a Response, or the result of `next()`. Inside `next()` lies an
object describing what we ultimately requested, including the Response, but not
only it:

```tsx
const root = Point0.lets
  .root()
  .middleware(async ({ next }) => {
    const result = await next()
    console.log(result.variant.type) // "endpoint" | "error" | "middleware" | "options" | "page" | "publicdir"
    // and a lot more, read more in the documentation itself
    return result
  })
  .root()
```

You can also pass a path as the first argument that the middleware will react
to:

```tsx
export const root = Point0.lets
  .root()
  // hand off everything that comes to /api/auth/* to better-auth
  .middleware('/api/auth/*', async ({ request }) => {
    // request.original — this is the native Request from the Fetch API
    return await betterAuthServer.handler(request.original)
  })
  .root()
```

If we want to do something in the middleware that will then be available in our
`.ctx()` and `.loader()`, we can put it into `request.state` or `request.cache`
(more in the section on request):

```tsx
export const root = Point0.lets
  .root()
  .middleware(({ request, next }) => {
    request.state.x = 123
    return next()
  })
  .root()
```

We have several built-in middlewares. These functions simply return a function
that becomes a middleware:

```tsx
import { openapi } from '@point0/openapi'
import { cors } from '@point0/cors'
import { basicAuth } from '@point0/basic-auth'

export const root = Point0.lets
  .root()
  .middleware(cors({ origin: true, credentials: true }))
  .middleware(basicAuth({ users: { admin: 'adminpassword' } }))
  .middleware(openapi({ route: '/openapi.json', scalar: '/scalar' }))
  .root()
```

Read more in the docs [about .middleware()](middleware).

## Request

Loaders, `.ctx()`, and middleware receive a `request` object — our wrapper
around the native Fetch request. All fields on it are computed only when you
access them, so creating such an object on every request is cheap.

```tsx
export const meQuery = root.lets
  .query()
  .loader(async ({ request }) => {
    // native Request from the Fetch API — in case you need it directly
    request.original

    // method in upper case: 'GET' | 'POST' | ...
    request.method

    // headers, normalized to lower case
    const auth = request.headers['authorization']

    // cookies are already parsed into an object
    const session = request.cookies['session']

    // the parsed request location (pathname, search, ...)
    request.location

    // and a handy store for the duration of a single request — for example, so you
    // don't fetch the session twice per request
    request.state.me ??= await getMe(request)

    // during ssr, having received 1 request to the page to load query data, we create — right on the server —
    // more requests that go through exactly the same path, and to preserve request state across these requests
    // it's better to put it in request.cache rather than request.state
    request.cache.me ??= await getMe(request)

    // the client's ip address
    request.from.ip

    // the client's user-agent
    request.from.userAgent

    // the client's location, from which the request was sent
    request.from.location

    return { me: request.cache.me }
  })
  .query()
```

For convenience when building your own helpers, you can also grab the `request`
via `getRequest` or `getRequestOrUndefined`:

```tsx
import { getRequest, getRequestOrUndefined } from '@point0/core'

// if the request isn't found in the environment (the node async storage where we put the request at request time),
// an error is thrown; the type here is Request0
const request1 = getRequest()

// if the request isn't found in the environment, you get undefined;
// the type here is Request0 | undefined
const request2 = getRequestOrUndefined()
```

This information will come in handy to understand how the CookieStore works.

Read more in the docs [about Request](request).

## Response

We control the response through the `set` helper, which arrives in the same
place as `request` (in loaders, `.ctx()`, middleware). With it you can set
headers, cookies, and status without assembling a `Response` by hand:

```tsx
export const loginMutation = root.lets
  .mutation()
  .input(z.object({ email: z.string(), password: z.string() }))
  .loader(async ({ input, set }) => {
    const { user, token } = await auth.login(input)

    // set a cookie (by default path '/', sameSite 'lax')
    set.cookies('session', token, {
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24,
    })

    // a header
    set.headers('X-User-Id', user.id)

    // the status
    set.status(201)

    return { user }
  })
  .mutation()
```

You delete a cookie by passing `undefined` instead of a value:
`set.cookies('session', undefined)`. And if you need a fully custom response —
bytes, a redirect to a file, anything at all — you can simply return a native
`Response` from middleware or a loader, and all the effects set via `set` will
be applied to it.

For convenience when building your own helpers, you can grab the request's
effects via `getEffects` or `getEffectsOrUndefined`:

```tsx
import { getEffects, getEffectsOrUndefined } from '@point0/core'

// if the effects aren't found in the environment (the node async storage where we put the effects at request time),
// an error is thrown; the type here is Effects0
const effects1 = getEffects()

// if the effects aren't found in the environment, you get undefined;
// the type here is Effects0 | undefined
const effects2 = getEffectsOrUndefined()
```

This information will come in handy to understand how the CookieStore works.

Read more in the docs [about Response](response).

## File Upload

A file is just part of the input — it's simply described as a file in the
schema. On the client you put a `File` into the mutation's input, and on the
server you receive it in the loader. The framework assembles the FormData
itself.

```tsx
import { z } from 'zod'

export const ideaCreateMutation = root.lets
  .mutation()
  .input(
    z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      image: z.file().optional(), // here it is, the file
    }),
  )
  .loader(async ({ input }) => {
    // on the server input.image is a regular File (a subclass of Blob)
    const imageBase64 = input.image
      ? Buffer.from(await input.image.arrayBuffer()).toString('base64')
      : undefined
    const idea = await prisma.idea.create({
      data: { title: input.title, content: input.content, image: imageBase64 },
    })
    return { idea }
  })
  .mutation()

export const ideaCreatePage = root.lets
  .page('/ideas/create')
  .head(() => `Create idea`)
  .page(() => {
    const [image, setImage] = useState<File | undefined>(undefined)
    return (
      <div>
        <h1>Create idea</h1>
        <Form
          defaultValues={{
            title: idea.title,
            content: idea.content,
          }}
          onSubmit={({ title, content }) => {
            const { idea } = await ideaCreateMutation.fetchMutation({
              id: idea.id,
              title,
              content,
              image, // just pass the file through as is
            })
            await navigate('idea', { id: idea.id })
          }}
        >
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0] || undefined
              // I deliberately did this without imaginary helpers, to show how primitive it is
              setImage(file)
            }}
          />
          <Input label="Title" name="title" />
          <Textarea label="Description" name="content" />
          <Button>Create</Button>
        </Form>
      </div>
    )
  })
```

Read more in the docs [about file upload](file-upload).

## Action

For talking to the server we have queries and mutations. What's missing is
proper endpoints. That's what actions are for — there we control the method and
the path.

```tsx
export const stripeWebhookAction = root.lets
  .action('POST', '/api/webhooks/stripe')
  .loader(async ({ request }) => {
    const event = await stripe.webhooks.constructEvent(
      await request.original.text(),
      request.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    )
    await handleStripeEvent(event)
    return { received: true }
  })
  .action()
```

An action can also have an input schema for route params, search, body, and
headers. If we declare a body schema, then the body is read by the framework
itself and parsed as json/formData, but it keeps the original content in
`request.rawBody`.

```tsx
const action = root.lets
  .action('POST', '/api/my-test/:id')
  .params(z.object({ id: z.coerce.number().min(1) }))
  .headers(z.object({ x: z.string().min(1) }))
  .search(z.object({ y: z.string().min(1) }))
  .body(z.object({ b: z.number().min(1), d: z.bigint() }))
  // and when working with an action, we can skip writing .loader()
  // and just declare that same loader in the closing .action()
  .action(({ request, headers, search, body, params }) => {
    return {
      headers,
      search,
      params,
      body,
      bodyUsed: request.original.bodyUsed,
    }
  })
```

And we can also use the actions themselves as a query, as a mutation, or even as
an infinite query:

```tsx
export const ideaUpdateAction = root.lets
  .action('PUT', '/api/ideas/:id')
  .body(
    z.object({
      title: z.string().min(1),
      content: z.string().min(1),
    }),
  )
  .loader(async ({ params: { id }, body: { title, content } }) => {
    const idea = await prisma.idea.update({
      where: { id },
      data: { title, content },
    })
    return { idea }
  })
  // and we just finish it with the word we need.
  // yes, I said every point should start with the same word the .lets started with,
  // but action is special — it can end with .query() or .mutation() or .infiniteQuery()
  .mutation()

export const ideaEditPage = root
  .lets('page', 'ideaEdit', '/ideas/:id/edit')
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .head(({ data: { idea } }) => `Edit: ${idea.title}`)
  .page(({ data: { idea } }) => (
    <div>
      <h1>Editing idea: {idea.title}</h1>
      <Form
        defaultValues={{
          title: idea.title,
          content: idea.content,
        }}
        onSubmit={({ title, content }) => {
          await ideaUpdateAction.fetchMutation({
            // everything like in a regular mutation, but in simple mutations our input is flat
            // while in actions it's split into search, params, body
            params: { id: idea.id },
            body: { title, content },
          })
          await navigate('idea', { id })
        }}
      >
        <Input label="Title" name="title" />
        <Textarea label="Description" name="content" />
        <Button>Save</Button>
      </Form>
    </div>
  ))
```

I also want to point out that our simple `mutation`, `query`, `infiniteQuery`,
unlike trpc, don't send everything to a single endpoint — they have stable URLs
too. Both queries and mutations send POST requests with the input in the body to
their stable kebab-cased URLs of the form
`/_point0/<scope>/<type>/<name-in-kebab-case>` — for example,
`/_point0/root/query/query-name-kebab-cased` and
`/_point0/root/mutation/mutation-name-kebab-cased`. And because of this we can
get the full picture of our endpoints in an OpenAPI schema.

Read more in the docs [about actions](action).

## OpenAPI

Since all our queries, mutations, and actions have a typed input and work like
real HTTP endpoints, we can serve an OpenAPI schema for them. The
`@point0/openapi` package is responsible for this, and it's wired in with a
single piece of middleware:

```tsx
import { openapi } from '@point0/openapi'

export const root = Point0.lets
  .root()
  .middleware(
    openapi({
      route: '/openapi.json', // the schema itself
      scalar: '/scalar', // a pretty UI (Scalar)
      swagger: '/swagger', // or the classic Swagger UI
      filter: 'all', // which points to include
    }),
  )
  .root()
```

The schema is assembled automatically from your points' input schemas. The
output type, however, I don't generate from the types yet (that's a plan for the
future), so if you need the output type in the OpenAPI schema, you have to
declare it yourself via `.response(schema)`. To fine-tune the OpenAPI output —
add a description, tags, an `operationId`, or mark an endpoint as `deprecated` —
a point has the `.openapi()` method:

```tsx
export const ideaUpdateAction = root.lets
  .action('PUT', '/api/ideas/:id')
  .body(
    z.object({
      title: z.string().min(1),
      content: z.string().min(1),
    }),
  )
  .response(z.object({ idea: ideaSchema }))
  .openapi({
    summary: 'Create idea',
    description: 'Creates a new idea and returns it',
    tags: ['ideas'],
    // any other standard OpenAPI settings
  })
  .action(async ({ params: { id }, body: { title, content } }) => {
    const idea = await prisma.idea.update({
      where: { id },
      data: { title, content },
    })
    return { idea }
  })
```

Read more in the docs [about OpenAPI](openapi).

## Infer

Sometimes you need to pull a type out of a point — for example, the type of the
data a query returns, or the type of its input, to reuse it in your own code.

```tsx
// the type of the data the query's loader returns
type IdeaViewData = typeof ideaViewQuery.Infer.QueriedData
// → { idea: Idea }

// the type of the query's raw input
type IdeaViewInput = typeof ideaViewQuery.Infer.InputRaw
// → { id: string }
```

There's a lot in there (`InputRaw`, `QueriedData`, `Error`, `Ctx`, and dozens of
others), but in everyday work what you usually need is exactly the data and the
input. This is completely free at runtime — `Infer` exists only in the types.

Read more in the docs [about Infer](infer).

## Query Client

Since under the hood we use react-query, its `QueryClient` lives somewhere. It's
created separately so it can be shared between server and client (on the server
there's a separate instance per request, so users' data never gets mixed up):

```tsx
// @/lib/query-client
import { createQueryClient } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'

export const queryClient = createQueryClient(() => new QueryClient())
```

And from there it's passed into a regular `QueryClientProvider` in your
`app.client.tsx`. You should understand that `queryClient` is typed as the
original query client, but is actually a proxy object — deliberately, so that
when you call `queryClient.anyMethod()` on the server, we grab the real
`queryClient` from the async store created for that request on the server. So
you use it the way you're used to, and all the safety works automatically under
the hood.

Read more in the docs [about the Query Client](query-client).

## Error Class

Errors in Point0 are never `unknown`. We have a base class `ErrorPoint0`, and in
any `error` (in the `.error()` component, in a query's `result.error`) you get
exactly that, with clear fields.

By default it has these fields, all optional:

```ts
const error = new ErrorPoint0('message', {
  code: 'ERROR_CODE', // any string according to the type, so you can extend it, but in reality they're all fixed
  status: 500, // any number
  meta: {}, // any object
  redirect: new RedirectTask(), // a special RedirectTask object here
  response: new Response(), // a Response here that can override the response, otherwise the serialized error is just sent to the client
  headers: new Headers(), // Headers here that can override the response headers
})
```

And it also has methods:

```ts
ErrorPoint0.from(unknown) // returns an ErrorPoint0 instance from anything
ErrorPoint0.serializePublic(error) // serializes the error into a public format to send to the client
ErrorPoint0.serializePrivate(error) // serializes the error into a private format to send to the logs
```

You can swap out the error class for your own via `.errorClass()` on the root.
There's one requirement: your class must have the same structure or wider than
`ErrorPoint0`, and be `instanceof Error`. You can just look at the error's
source in Point0, copy it, and add whatever constructs you need.

But I also have another library [`@1gr14/error0`](https://1gr14.dev/error0) for
typed errors that are extensible with plugins. You can use it:

```tsx
import { Error0 } from '@1gr14/error0'
import { causePlugin } from '@1gr14/error0/plugins/cause'
import { codeStatusPlugin } from '@1gr14/error0/plugins/code-status'
import { flatOriginalPlugin } from '@1gr14/error0/plugins/flat-original'
import { metaPlugin } from '@1gr14/error0/plugins/meta'
import { redirectPlugin } from '@1gr14/error0/plugins/point0-redirect'
import { expectedPlugin } from '@1gr14/error0/plugins/expected'
import { responsePlugin } from '@1gr14/error0/plugins/response'
import { stackPlugin } from '@1gr14/error0/plugins/stack'

export const AppError = Error0.mark('AppError')
  .use(
    codeStatusPlugin({
      codes: {
        UNAUTHORIZED: 401,
        FORBIDDEN: 403,
        UNSUBSCRIBED: 403,
      },
      transport: 'public',
    }),
  )
  .use(metaPlugin())
  .use(causePlugin())
  .use(responsePlugin())
  .use(redirectPlugin())
  .use(flatOriginalPlugin())
  .use(expectedPlugin({ transport: 'public' }))
  .use(stackPlugin())
export type AppError = InstanceType<typeof AppError>

export const root = Point0.lets.root().errorClass(AppError).root()
```

An error travels from the server to the client, and we don't want to leak the
stack and the internals. That's why, when an error is passed, it's serialized in
two different ways: `serializePublic` in production (the client sees only what's
safe — message, code, redirect) and `serializePrivate` in dev mode (everything
is visible — stack, meta, status). The full, private version always goes to the
logs. So in production the user won't see anything extra, while you see
everything in the logs.

Read more in the docs [about error handling](error-handling).

## Eventer

To analyze what's happening in your points, there's the eventer. A single event
bus that's convenient for hooking up logging and observability. You can
subscribe to both sides (`.on`), or separately (`.serverOn` / `.clientOn`):

```tsx
export const root = Point0.lets
  .root()
  .on('error', ({ side, name, error, meta }) => {
    console.error({ ...meta, side, name, error })
  })
  .root()
```

There are many events — start/success/error for queries, infinite queries,
mutations, page prefetches, server fetches. The callback receives: `side`
(client/server), `name` (the event name), `error` (if any), `meta` (what's safe
to log), and `data` (the raw data, including, for example, the response itself —
you shouldn't log that, but you can pull something out of it).

Read more in the docs [about events](events).

## Engine

The Engine is both config and runtime. A single file `src/engine.ts` describes
everything: where the server is, where the client(s) are, what port they use,
where to look for points, where to generate files, what to serve as static. The
CLI takes this same `engine` and simply calls functions like `engine.dev(...)`,
`engine.build(...)`. Even all requests just pass through `engine.fetch(request)`

```tsx
import { Engine } from '@point0/engine'

export const engine = Engine.create({
  file: import.meta.url, // the engine needs to know where it itself lives
  ssr: true, // enable server-side rendering
  pointsGlob: '**/*.{ts,tsx,mdx}', // where to look for points
  server: {
    scope: 'root',
    port: process.env.SERVER_PORT || process.env.PORT,
    entry: { main: './index.server.ts' },
    points: async () => await import('./generated/point0/points.server'),
    generate: { points: './generated/point0/points.server.ts' },
    outdir: '../dist/server',
  },
  // clients: [{}, {}] if you have multiple clients
  client: {
    scope: 'root',
    port: process.env.CLIENT_PORT,
    indexHtml: './index.html',
    app: async () => await import('./app.client'),
    points: async () => await import('./generated/point0/points.client'),
    generate: {
      points: './generated/point0/points.client.ts',
      routes: {
        outfile: './generated/point0/routes.ts',
        origin: 'process.env.CLIENT_URL',
      },
    },
    publicdir: { source: ['../public'], outdir: '../dist/client' },
    outdir: '../dist/client',
  },
})
```

There's always exactly one server. There can be several clients, in which case
each client has its own `scope`, its own generated points, its own bundle.

And right away I'll show the 3 files you need to bring up the server.

```ts
// src/preload.ts
import { engine } from './engine'

// we need this to apply the compiler's ban plugin
// which strips client code out of the server, and server code out of the client
// the compiler does a lot more too, but that's covered in another section
// this thing also sets up the env variables we configured in engine.ts
await engine.preload()

// we keep this as a separate file because it may come in handy for running
// integration tests, which may also need the compiler's preload plugin
```

```ts
// src/index.server.ts
// first load the preload
await import('./preload.js')
// then the server code itself
await import('./app.server.js')
// To keep TS from complaining, we export an empty module
export {}
```

```ts
// src/app.server.ts
import { engine } from '@/engine.js'

// our server is being served
await engine.serve()

// but this is a regular server file, here you can initialize all sorts of workers,
// start crons, validate env variables, and so on
```

Read more in the docs [about the engine config](engine-config),
[about the engine runtime](engine-runtime).

## CLI

The framework itself provides a `point0` binary, which drives everything based
on your `src/engine.ts`:

```sh
point0 dev        # dev server (server + clients), watching, codegen on the fly
point0 dev --hot  # same, but with server-side hot reload
point0 generate   # generate points/routes/meta (see the section on the generator)
point0 build      # production build into dist/
point0 compile <file>  # show what the compiler turned a file into (for debugging)
```

In a real app's `package.json` it's usually just:

```json
{
  "scripts": {
    "dev": "point0 dev --hot",
    "generate": "point0 generate",
    "build": "point0 build",
    "start": "NODE_ENV=production bun run ./dist/server/index.server.js"
  }
}
```

The commands have flags — `--side server|client` (bring up only one side),
`--scope <scope>` (only one client), `--mode`, `--env` and others, but those are
already details for the documentation.

Read more in the docs [about the CLI](cli).

## MCP

`point0-project-mcp` helps the agent find its way around your project: show the
list of all points, find a specific one by its URL, compile a file (see what's
left of a point on the client and what's left on the server), trace the chain of
imports. You connect it like this. Say you use Cursor and Claude Code. Then in
`.cursor/mcp.json` and `mcp.json` we add:

```json
{
  "mcpServers": {
    "point0-project-mcp": {
      "command": "bun",
      "args": ["run", "mcp:point0:project"]
    }
  }
}
```

And in package.json we add:

```json
{
  "scripts": {
    "mcp:point0:project": "point0-mcp --meta ./src/generated/point0/meta.ts"
  }
}
```

The generator will generate meta.ts for us.

And there's also `point0-docs-mcp` — this is a search over Point0's own
documentation (hybrid: keywords plus semantics). So that the agent answers
questions about the framework from the up-to-date docs, and not from whatever it
made up for itself.

Read more in the docs [about the project MCP](mcp-project),
[about the docs MCP](mcp-docs).

## Publicdir

Static files (favicon, images, fonts, `robots.txt`, `.well-known/...`) are
served by publicdir. You specify a source directory, and you can also declare
dynamic files right here with a function, or point to subdirectories:

```tsx
export const engine = Engine.create({
  // ...
  client: {
    // ...
    publicdir: {
      source: [
        '../public', // everything from this folder is served from the root
        {
          // the key is the path to the file, the function's return value is its content
          'robots.txt': () => 'User-agent: *\nDisallow: /',
          '.well-known/appspecific/com.chrome.devtools.json': () => '{}',
        },
        // or subdirectories, then the content will be available at:
        // /a/one.txt
        // /b/two.json
        { '/a': '../public-a' },
        { '/b': '../public-b' },
      ],
      outdir: '../dist/client', // where to copy it during the build
    },
  },
})
```

In dev the files are served on the fly, during the build they're simply copied
into `outdir`. While serving in production, static files are cached in memory
within the specified allowed memory limit.

But honestly all of this looks like overkill, so in practice you'll most likely
do this:

```tsx
export const engine = Engine.create({
  // ...
  client: {
    // ...
    publicdir: {
      source: '../public',
      outdir: '../dist/client',
    },
  },
})
```

Read more in the docs [about publicdir](publicdir).

## Generator

The generator doesn't generate types, it essentially just generates index files.
In tRPC we had to assemble our endpoints ourselves; in point0 this is done
automatically. Also, the location where the generated files will be placed is
something you declare yourself in the `engine` settings.

I'll also note that for generation our code doesn't even need to be valid,
because everything is generated through static code analysis, and thanks to this
it works fast and is almost unbreakable.

Everything generated can safely go into `.gitignore`, because during the build
we regenerate everything from scratch anyway, just to be sure. And during dev
mode everything is generated on the fly.

### points.server.ts

Just an array of the points found in your project. We need it so we can pass it
back into the `engine` itself, and so that, when serving the server through
`engine.serve()`, we can find the right point on a request. Here's an example of
the generation:

```ts
import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
import {
  default as unnamed_1,
  ideaBestComponent as ideaBestComponent_8,
} from '../../pages/home.js'
import { page as page_2 } from '../../pages/about.mdx'
import { ideaListPage as ideaListPage_3 } from '../../pages/idea-list.js'
import {
  ideaCreatePage as ideaCreatePage_4,
  ideaUpdatePage as ideaUpdatePage_6,
  ideaCreateMutation as ideaCreateMutation_9,
  ideaUpdateMutation as ideaUpdateMutation_11,
} from '../../pages/idea-create-update.js'
import { ideaViewPage as ideaViewPage_5 } from '../../pages/idea-view.js'
import {
  ideaNewsPage as ideaNewsPage_7,
  ideaNewsPostCreateMutation as ideaNewsPostCreateMutation_10,
} from '../../pages/idea-news.js'
import { ideaViewQuery as ideaViewQuery_12 } from '../../lib/idea.js'
export default [
  root_0,
  unnamed_1,
  page_2,
  ideaListPage_3,
  ideaCreatePage_4,
  ideaViewPage_5,
  ideaUpdatePage_6,
  ideaNewsPage_7,
  ideaBestComponent_8,
  ideaCreateMutation_9,
  ideaNewsPostCreateMutation_10,
  ideaUpdateMutation_11,
  ideaViewQuery_12,
] as PointsDefinition<
  (typeof root_0)['Infer']['RequiredCtx'],
  (typeof root_0)['Infer']['Error']
>
```

### points.client.ts

In the settings we can tell it to generate exactly the same file as for the
server points, that is, with static imports — then essentially all the files end
up in a single bundle. But more often we want lazy loading, so by default an
array with dynamic imports is generated. We then pass these points into our
`index.client.ts`, so that during the build the points end up in the bundle as
separate chunks.

```ts
import type { PointsDefinition } from '@point0/core'
import { root as root_0 } from '../../lib/root.js'
export default [
  root_0,
  {
    type: 'page',
    name: 'home',
    route: '/',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../../pages/home.js')).default,
  },
  {
    type: 'page',
    name: 'about',
    route: '/about',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../../pages/about.mdx')).page,
  },
  {
    type: 'page',
    name: 'ideaList',
    route: '/ideas',
    polh: true,
    layouts: ['generalLayout'],
    point: async () => (await import('../../pages/idea-list.js')).ideaListPage,
  },
  {
    type: 'page',
    name: 'ideaCreate',
    route: '/ideas/new',
    polh: true,
    layouts: ['generalLayout'],
    point: async () =>
      (await import('../../pages/idea-create-update.js')).ideaCreatePage,
  },
  {
    type: 'page',
    name: 'ideaView',
    route: '/ideas/:id',
    polh: true,
    layouts: ['generalLayout', 'idea'],
    point: async () => (await import('../../pages/idea-view.js')).ideaViewPage,
  },
  {
    type: 'page',
    name: 'ideaUpdate',
    route: '/ideas/:id/edit',
    polh: true,
    layouts: ['generalLayout'],
    point: async () =>
      (await import('../../pages/idea-create-update.js')).ideaUpdatePage,
  },
  {
    type: 'page',
    name: 'ideaNews',
    route: '/ideas/:id/news',
    polh: true,
    layouts: ['generalLayout', 'idea'],
    point: async () => (await import('../../pages/idea-news.js')).ideaNewsPage,
  },
  {
    type: 'layout',
    name: 'generalLayout',
    route: '/',
    point: async () => (await import('../../layouts/general.js')).generalLayout,
  },
  {
    type: 'layout',
    name: 'idea',
    route: '/ideas/:id',
    point: async () => (await import('../../layouts/idea.js')).ideaLayout,
  },
] as PointsDefinition<
  (typeof root_0)['Infer']['RequiredCtx'],
  (typeof root_0)['Infer']['Error']
>
```

### routes.ts

We've already talked about routes. We simply collect the routes from all the
points:

```ts
import { Routes } from '@1gr14/route0'

export const routes = Routes.create(
  {
    home: '/',
    about: '/about',
    ideaList: '/ideas',
    ideaCreate: '/ideas/new',
    ideaView: '/ideas/:id',
    ideaUpdate: '/ideas/:id/edit',
    ideaNews: '/ideas/:id/news',
  },
  { origin: process.env.CLIENT_URL },
)
```

### meta.ts

The full meta information about the points, it's also needed for the MCP server
that analyzes your project. Its content is roughly like this:

```ts
import { Route0 } from '@1gr14/route0'
import { Engine } from '@point0/engine'
export default {
  engine: {
    file: '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/engine.ts',
    import: async () =>
      (
        await Engine.findAndImportSelf({
          engineFile:
            '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/engine.ts',
        })
      ).engine,
    server: {
      scope: 'root',
    },
    clients: [
      {
        scope: 'root',
      },
    ],
  },
  points: [
    {
      scope: 'root',
      type: 'root',
      name: 'root',
      id: 'root:root:root',
      tags: [],
      description: undefined,
      route: undefined,
      endpoint: undefined,
      pos: {
        file: '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/lib/root.tsx',
        line: 9,
        column: 20,
      },
      import: async () => (await import('../../lib/root.js')).root,
      valid: true,
      errors: [],
      ssr: true,
      parents: [],
      layouts: [],
    },
    {
      scope: 'root',
      type: 'page',
      name: 'home',
      id: 'root:page:home',
      tags: [],
      description: undefined,
      route: Route0.create('/'),
      endpoint: {
        method: 'GET',
        route: Route0.create('/_point0/root/page/home'),
      },
      pos: {
        file: '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/pages/home.tsx',
        line: 37,
        column: 15,
      },
      import: async () => (await import('../../pages/home.js')).default,
      valid: true,
      errors: [],
      ssr: true,
      parents: [
        {
          scope: 'root',
          type: 'layout',
          name: 'generalLayout',
          id: 'root:layout:generalLayout',
          pos: {
            file: '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/layouts/general.tsx',
            line: 5,
            column: 29,
          },
        },
        {
          scope: 'root',
          type: 'root',
          name: 'root',
          id: 'root:root:root',
          pos: {
            file: '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/lib/root.tsx',
            line: 9,
            column: 20,
          },
        },
      ],
      layouts: [
        {
          scope: 'root',
          type: 'layout',
          name: 'generalLayout',
          id: 'root:layout:generalLayout',
          pos: {
            file: '/Users/iserdmi/cc/opensource/1gr14/point0/examples/basic/src/layouts/general.tsx',
            line: 5,
            column: 29,
          },
        },
      ],
    },
    // ...
  ],
}
```

### assets.d.ts

Asset imports are also managed by the framework itself, with built-in svgr and
the ability to choose which extensions of static files can be imported and, on
build, end up in the dist folder. Accordingly, we need to define the types for
asset imports. The generator will generate the needed file by itself:

```ts
declare module '*.svg?react' {
  import type { FC, SVGProps } from 'react'
  const ReactComponent: FC<SVGProps<SVGSVGElement>>
  export default ReactComponent
}
declare module '*.png' {
  const src: string
  export default src
}
declare module '*.png?url' {
  const src: string
  export default src
}
declare module '*.png?file' {
  const src: string
  export default src
}
declare module '*.png?text' {
  const src: string
  export default src
}
declare module '*.png?raw' {
  const src: string
  export default src
}
declare module '*.jpg' {
  const src: string
  export default src
}
declare module '*.jpg?url' {
  const src: string
  export default src
}
declare module '*.jpg?file' {
  const src: string
  export default src
}
declare module '*.jpg?text' {
  const src: string
  export default src
}
declare module '*.jpg?raw' {
  const src: string
  export default src
}
// other extensions
```

Read more in the docs [about the generator](generator).

## Compiler

Initially, the plan was that the compiler would only be responsible for cutting
server code out of the client and client code out of the server. Later it also
became responsible for injecting any babel plugins, processing assets,
preventing unwanted imports, finding points as such, parsing mdx files,
substituting constant env variables, and processing env helpers.

The compiler itself comes in a choice of formats: a bun plugin, a vite plugin, a
babel plugin. Under the hood they all use the same code, so they work
identically.

If you use bun, then the compiler as a plugin is applied when you call
`engine.preload()` — that's exactly why in our wrapper we call this before
importing any other context, so that the plugin is applied before the import,
and by the time of the import all the code has already been correctly trimmed
for the server. For the client, this same plugin is inserted in the form of a
bun static plugin.

To see what your code looks like after compilation, you can run the command:

```bash
point0 compile <file> --side <server|client>
```

Here, for example, is an original file like this:

```tsx
// src/pages/idea.tsx
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'
import { SomethingForClient } from '@/components/something-for-client'

export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
      <SomethingForClient />
    </div>
  ))
```

Let's imagine that you have ssr turned off — then you get this:

```tsx
// point0 compile src/pages/idea.tsx --side server
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'
// unused imports will be removed on their own after the code is cut out

export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .loader(({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: params.id },
    })
    return { idea }
  })
  .page()

// point0 compile src/pages/idea.tsx --side client
import { root } from '@/lib/root'
import { SomethingForClient } from '@/components/something-for-client'
// and here prisma cut itself out

export const ideaPage = root
  .lets('page', 'idea', '/ideas/:id')
  .loader()
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
      <div>{idea.content}</div>
      <SomethingForClient />
    </div>
  ))
```

And the code stayed fully working for the runtime environment. The client
doesn't know the body of the loader, but it knows that it exists, and it also
knows the name and the path of the point, so it has everything it needs to make
a request to the server. And the server, since it has ssr turned off, only needs
to know the body of the loader itself and, again, the name and path of the
point, so that it knows what to respond to the client with when the client makes
a request.

You can pass your own babel plugins into the compiler via:

```ts
export const engine = Engine.create({
  // ...
  compiler: {
    babel: {
      plugins: ['babel-plugin-react-compiler'],
    },
  },
})
```

The compiler caches all compilation results, so on the very first run of the
project a bit more time passes, and afterwards it's always very fast, and
recompilation happens only when a file changes, or when the settings of the
compiler itself change.

You can clear the cache with the command:

```bash
point0 prune
```

Read more in the docs [about the compiler](compiler).

## HMR

Since we're already talking about the compiler, I want to tell you how I tricked
react and made HMR work when importing any points from a file. From a single
file we can import a mutation, and a page, and a component, and a query.
Essentially, from react's point of view, only the component among them is a
component. But during dev mode, the compiler appends `._tail(() => null)` to the
end of the point:

```tsx
export const ideaUpdateMutation = root
  .lets('mutation', 'ideaUpdate')
  .input(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      content: z.string().min(1),
    }),
  )
  .loader(async ({ input: { id, title, content } }) => {
    const idea = await prisma.idea.update({
      where: { id },
      data: { title, content },
    })
    return { idea }
  })
  .mutation()
  ._tail(() => null)
```

The `ideaUpdateMutation` itself is this very function returned from
`_tail(() => null)`, which is why both bun and vite consider it a component. And
we ourselves never access `ideaUpdateMutation` directly, only its methods, and
they are all in place.

Read more in the docs [about dev mode](dev).

## Assets

I thought about letting assets work natively the way bun suggests they should
work. But that's not possible, because during ssr, bun just returns an absolute
path to the file on the server, while the client on the same bun really does
return a link to the asset that will end up in the bundle. But it's impossible
to synchronize this behavior with bun's native means. So I made the compiler
handle all of this on its own, and while I was at it I also wired in SVGR right
away.

```tsx
import logoUrl from '@/assets/logo.png' // by default — the url to the file
import GemIcon from '@/assets/gem.svg?react' // ?react — this is a React component (via SVGR)
import logoText from '@/assets/logo.png?text' // ?text — the contents as a string
```

```tsx
<img src={logoUrl} />
<GemIcon className="w-5 h-5" />
```

Which extensions to treat as assets is configured in the `engine` config:

```ts
export const engine = Engine.create({
  // ...
  assets: {
    enabled: true,
    extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'],
    defaultMode: 'url', // you can say to not treat as an asset without '?', or which exact type to treat it as without specifying '?'
    svgr: {}, // svgr options
  },
})
```

Based on this config, `assets.d.ts` is generated. Again, you can not specify
`assets` in the config at all, and then the default value will be used.

Read more in the docs [about assets](assets).

## Env Variables

It's logical that all of the process's env variables end up on the server. And
only the ones we specify should end up on the client.

```ts
export const engine = Engine.create({
  // ...
  client: {
    env: {
      // these will be substituted into index.html on a request to the server
      vars: ['SERVER_URL', 'CLIENT_SENTRY_DSN'],
      // these variables will be baked right into index.html when that index.html is built
      consts: ['MIXPANEL_TOKEN'],
    },
  },
})
```

I like this approach more than specifying prefixes like "PUBLIC\_", because in
practice I most often already have a validation schema for env variables
somewhere, and it's much more convenient for me to just pass its keys into the
config and manage all of this from one place.

If you like the approach with prefixes more, you can do it like this:

```ts
export const engine = Engine.create({
  // ...
  client: {
    env: {
      // now all env variables with the prefix PUBLIC_ will be substituted into index.html on a request to the server
      vars: 'PUBLIC_*',
      // all env variables with the prefix CONST_PUBLIC_ will be baked right into index.html when that index.html is built
      consts: 'CONST_PUBLIC_*',
    },
  },
})
```

For some reasons you might also want to just bake in some constants or some
values that came from somewhere, for example like this:

```ts
export const engine = Engine.create({
  // ...
  client: {
    env: {
      vars: {
        A: 1,
      },
      consts: {
        B: 2,
      },
    },
  },
})
```

You can also combine all these approaches:

```ts
export const engine = Engine.create({
  // ...
  client: {
    env: {
      vars: [
        {
          A: 1,
        },
        'PUBLIC_*',
        'SERVER_URL',
        'CLIENT_URL',
      ],
      consts: [
        {
          B: 2,
        },
        'CONST_PUBLIC_*',
        'MIXPANEL_TOKEN',
      ],
    },
  },
})
```

On the server, too, you can pass some values into the envs, but most importantly
you can define which of these envs will be constants, which means they'll be
substituted as real values, which also means the unused code after they're
inlined will be trimmed as well:

```ts
export const engine = Engine.create({
  // ...
  server: {
    env: {
      // here you can pass in some values if you want
      vars: {
        X: 3,
      },
      // and here you can define which envs become constants
      consts: ['ENABLED_*'],
    },
  },
})
```

And then somewhere in the code

```ts
// originally
if (process.env.ENABLED_X === 'true') {
  console.log('X is enabled')
} else {
  console.log('X is disabled')
}

// after compilation (and it happens both in the dev environment and at the build stage)
// everything unnecessary is simply cut out and what remains is:
console.log('X is enabled')
// If some imports became unused, they'll be cut out too
```

## Env Helpers

We have a special object `env` that helps you work in a fullstack project. First
let's look at the constants you can obtain:

```tsx
import { env } from '@point0/core'

// These constructs are again replaced with constants and let you

env.mode.name // 'development' | 'production' | 'test' // this is the same as process.env.NODE_ENV
env.mode.is.production // true | false
env.mode.is.test // true | false
env.mode.is.development // true | false

env.side.name // 'server' | 'client'
env.side.is.server // true | false
env.side.is.client // true | false

env.build.was // true | false // you can control how the code looks before the build and after the build
```

With this same helper we can manually do code splitting. Let's say we have some
purely server-side helper and a purely client-side one, but they have the same
type. For example, tracking an event. But at the call sites we'd like to use one
and the same helper. Then you can do it like this:

```ts
import { env } from '@point0/core'
import { mixpanelServerTrackEvent } from '@/lib/mixpanel/server'
import { mixpanelClientTrackEvent } from '@/lib/mixpanel/client'

export const trackEvent = env.side.define({
  client: mixpanelClientTrackEvent,
  server: mixpanelServerTrackEvent,
})

trackEvent('eventName', { property: 'value' })
```

After compilation, depending on whether it's the client or the server, you get
code like this:

```ts
// client
import { env } from '@point0/core'
import { mixpanelClientTrackEvent } from '@/lib/mixpanel/client'

export const trackEvent = mixpanelClientTrackEvent

// server
import { env } from '@point0/core'
import { mixpanelServerTrackEvent } from '@/lib/mixpanel/server'

export const trackEvent = mixpanelServerTrackEvent
```

And what's more, into this very `env.side.define` you don't have to pass
functions, just any values. And not even necessarily of the same type — then the
resulting type there will be a union.

And if you just want to declare something that's available only on the server in
a file that has both client and server code, you can do it like this:

```ts
import { env } from '@point0/core'
// here the type will be `undefined | ((name: string) => string)`
// since on the client it's undefined
const myServerOnlyFn1 = env.side.define.server((name: string) => {
  return `Hello, ${name}!`
})

// but that's not very convenient, so if you promise yourself not to use
// this function on the client, you can write it like this:
const myServerOnlyFn2 = env.side.define.unsafe.server((name: string) => {
  return `Hello, ${name}!`
})
// then the type will be `(name: string) => string`
```

There are more helpers there, read more in the docs.

Read more in the docs [about env variables](env).

## Importer

Given that the code is cut out by the compiler, it's fairly easy to mess
something up and import server code into the client or vice versa. But most
often we know in advance which modules are specifically server-side or
specifically client-side, so we can protect ourselves.

Let's say we have a file `src/lib/prisma.ts` that definitely must never end up
on the client — then you can simply add `import '@point0/core/server-only'` in
the file. Now as soon as the compiler sees that we're importing
`src/lib/prisma.ts` on the client, it will throw an error:

```ts
import '@point0/core/server-only'
export const prisma = new PrismaClient()
```

The same effect can be achieved through the `engine` config settings:

```ts
export const engine = Engine.create({
  // ...
  client: {
    importer: {
      deny: [
        // file paths begin with .
        './lib/prisma.ts',
        // specific libraries we write just by the package name
        'dotenv',
      ],
    },
  },
})
```

When I adapted Point0 to expo, it turned out that there's client code there
which the server needs to be allowed to see, but the server must not run it. In
particular `const styles = StyleSheet.create({})`. Because we declare it in some
page's file, and the page can have a component that has our loader for the
server. And it turns out I can't just forbid importing from 'react-native' on
the server. However, I don't want to run its code at all. So we can not forbid
the module but mock it. After the mock, it can try to do whatever it wants, and
nothing will happen.

```ts
export const engine = Engine.create({
  // ...
  server: {
    importer: {
      mock: ['react-native', 'expo-router'],
    },
  },
})
```

Read more in the docs [about the importer](importer).

## Mdx

Mdx lets you write something like Markdown, but also use React components. If we
want to declare a page in such a component, we do it like this:

```mdx
import { Link } from '@/lib/navigation'
import { generalLayout } from '@/layouts/general'

export const page = generalLayout
  .lets('page', 'about', '/about')
  .loader(async () => {
    const lastIdea = await prisma.idea.findFirst({ orderBy: { id: 'desc' } })
    return { lastIdea }
  })
  .head('About')
  .page((props) => (
    <div className="prose">
      {/* Here is the content itself, described below */}
      <MDXContent {...props} />
    </div>
  ))

IdeaNick — a platform for ideas.

Fresh idea: <Link route="idea"
input={{ id: props.data.lastIdea.id }}>{props.data.lastIdea.title}</Link>
```

So this is still the same point construction (with a loader, `.head()`,
`.page()`), only the content here is Markdown with the ability to insert any
components.

Read more in the docs [about MDX](mdx).

## Wiring

In various parts of this article we talked about what connects where. Let's put
it all together and finally work through how it works:

```tsx
// engine.ts
// Our config and at the same time our server helper for serving points.
// It is very important not to statically import here anything that must go through the compiler
export const engine = Engine.create({
  // ...
  ssr: true,
  server: {
    // ...
    // this entry will be run during the point0 dev call
    // after the build, we will simply run bun dist/server/index.server.js
    entry: { main: './index.server.ts' },
    // this file is generated automatically and contains all our points
    generate: { points: './generated/point0/points.server.ts' },
    // and here we dynamically import these very points, so that before the moment
    // of the real import we have time to enable the bun compiler plugin
    points: async () => await import('./generated/point0/points.server'),
    outdir: '../dist/server',
  },
  client: {
    // ...
    indexHtml: './index.client.html',
    app: async () => await import('./app.client'),
    points: async () => await import('./generated/point0/points.client'),
    generate: {
      points: './generated/point0/points.client.ts',
      routes: {
        outfile: './generated/point0/routes.ts',
        origin: 'process.env.CLIENT_URL',
      },
    },
    outdir: '../dist/client',
    publicdir: {
      source: '../public',
      outdir: '../dist/client',
    },
  },
})
```

```tsx
// preload.ts
// needed in order to enable the bun plugin in the server runtime, which will
// compile our code on the fly, strip out code, and so on
// and it will also set the env variables that we configured in engine.ts
import { engine } from '@/engine'
await engine.preload({ nodeEnvFallback: 'development' })
```

```tsx
// index.server.ts
// the server entry point, needed in order to first load the bun plugin,
// and only then our server code, which
await import('./preload.js')
await import('./app.server.js')
export {}
```

```tsx
// app.server.ts
// here can be any other of our server code, for example database initialization
// starting workers, validating envs, and so on
import { engine } from '@/engine.js'
await engine.serve()
```

```
// bunfig.toml

// noOrphans Allows you to not leave hanging child processes
// in case the terminal is closed
[run]
noOrphans = true

// you should not add preload.ts here as a preload script
// it seems like the perfect place for it, but no.
// Because a preload script is loaded by any bun process, and if one day you
// use some other third-party cli executables on bun
// they will load this script, and they don't need it
```

```html
<!-- index.client.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./index.client.tsx"></script>
  </body>
</html>
```

```ts
// index.client.tsx
// this file is never seen by the server, so here we can safely validate
// the client envs. Otherwise it is similar to a standard React application.
import App from '@/app.client'
import points from '@/generated/point0/points.client'
import '@/styles/index.css'
import { ErrorBoundary } from '@/ui/error-boundary'
import { mount } from '@point0/react-dom/mount'

// the mount function is responsible for finding the data received from SSR, in particular
// the Query Client Dehydrated State, and hydrating the application on top of it.
mount(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
  // By passing the points here, they become globally available to the application
  points,
)
```

```tsx
// app.client.tsx
import { Router, RouterRoutes } from '@/lib/navigation'
import { UnheadProvider } from '@point0/core/unhead'
import { QueryClientProvider } from '@tanstack/react-query'
import { NProgress } from '@/components/other/nprogress'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/ui/theme'
import { ErrorPageComponent } from '@/components/other/error'
import { queryClient } from '@/lib/query-client'
import { Head } from '@unhead/react'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* UnheadProvider is a mandatory dependency, our .head() in points works through it.
      You can also use the standard unhead helpers useHead(), useSeoMeta(), in places where you need them */}
      <UnheadProvider>
        <Head>
          {/* declare everything in the head related to assets here, not in index.client.html
          otherwise bun will break their urls and try to make them its own assets, and we don't need that for the favicon
          and the like */}
          <link rel="shortcut icon" href="/favicon.ico" />
        </Head>
        <ThemeProvider />
        <Router>
          <NProgress />
          <Toaster />
          {/* The whole connection between page addresses and their components is known to the router because
          in index.client.tsx we passed them into the mount function */}
          <RouterRoutes
            Page404={() => (
              <ErrorPageComponent title="404" description="Page not found" />
            )}
          />
        </Router>
      </UnheadProvider>
    </QueryClientProvider>
  )
}
```

Read more in the docs [about wiring](engine-runtime).

## SSR

I wanted to make it so that we don't feel at all whether ssr is enabled or not.
The code we write should look the same. Initially, when I was making `.loader()`
in a page, I thought I would return its result to the client by serializing it
and inserting the result into index.html. And at first that's what I did, but
then I came to the conclusion that it's better to just treat all of this as a
query, and simply return the dehydration result of the query client in
index.html. This way, essentially, whether the page was requested from the
server in SSR format, where there will be a dehydrated query client, or whether
the page was initially a bare index.html and the requests went to the server
already from the client, the result is the same.

Also, initially, before rendering the page, I would figure out which loaders it
and its layouts have, and call their code, to stuff it into the server query
client, so that the page would render without loading states. But then I made
`.with()`, into which you can stuff several queries that can wait for each
other's results. And then components also came along, which essentially are
completely unknown whether they are on the page or not.

In the end, the decision on SSR is as follows. I render the page the first time.
I look at the state of the server query client; if there are queries that belong
to point0, they are in pending status, I haven't seen them before in this
render, and they are enabled, then, knowing their `queryKey`, which contains
everything needed to understand which point the query belongs to, I simply fetch
this query directly on the server, turning the status of this query either into
success or into error, doesn't matter. Then I render the page again. And so on
in a loop, until there are no unresolved queries left. In practice this comes
out to 2–4 re-renders per request.

You have to understand that SSR actually only happens on the first request of a
page; afterwards, when navigating, we no longer request html, we only download
the js chunk of the page itself, plus request the necessary data and insert it
into the query client. And to control this we have all these options in
`.prefetchPageOnNavigate('pageDehydratedStateAndClientQuery')`.

With the `pageDehydratedStateAndClientQuery` policy, before navigating to a page
we will ask the server to render the page in its head, to assemble a resolved
query client, and return to us only the result of its dehydration. Upon
receiving the dehydration result on the client, we simply slip it into the
client query client. Also, with this policy, all found `.clientLoader()` will be
called already on the page itself. For us as developers, this is the most
convenient option in terms of DX. Because then we know for sure that all the
needed queries will be assembled. But we pay for this with server re-renders. I
don't see anything terrible about this at all, but I understand those who would
like to avoid re-renders, and for that we also have a solution.

There is the `serverAndClientQuery` policy; in that case we won't render at all
when moving from one page to another, but just look at the loaders of the
layouts and the page, and request only those. But this way, if queries were
declared in `.with()`, or in some components inside the page, then they won't be
discovered, and after navigating to a page loaded in this way, we will see
loading states in such places.

When using the `serverAndClientQuery` policy, to avoid loading in those places,
we can specify `.onPrefetchPage()` in the page or layout point:

```tsx
export const IdeaBestComponent = root.lets
  .component()
  .loader(async () => {
    const bestIdea = await prisma.idea.findFirst({
      orderBy: {
        rating: 'desc',
      },
    })
  })
  .component(({ data: { bestIdea } }) => (
    <div>
      <h1>{bestIdea.title}</h1>
    </div>
  ))

export const ideaPage = root.lets
  .page('/idea/:id')
  .onPrefetchPage(async ({ location }) => {
    await Promise.all([
      ideaViewQuery.prefetchQuery({ id: location.params.id }),
      IdeaBestComponent.prefetchQuery(),
    ])
  })
  .with(ideaViewQuery, ({ params }) => ({ id: params.id }))
  .page(({ data: { idea } }) => (
    <div>
      <h1>{idea.title}</h1>
    </div>
  ))
```

So if it's important for you to avoid server re-renders, just use
`.prefetchPageOnNavigate('serverAndClientQuery')` and write everything you need
in `.onPrefetchPage()`.

And the same `.onPrefetchPage()` solves the first visit to a page via a direct
link too — there's nothing extra to turn on. It runs on the server once before
the first render, so whatever you warmed there is already in the cache when
rendering starts, collapsing the discover loop. And if your loaders are
predictable, you don't even have to write the warm-up by hand — flip on
`prefetchLoadersBeforePageRender` and Point0 prefetches the page's and layouts'
declared loaders up front for you. Add `allowedRerendersCount: 0` to also stop
the store/cookie stabilization re-renders:

```ts
export const engine = Engine.create({
  // ...
  ssr: {
    prefetchLoadersBeforePageRender: true,
    allowedRerendersCount: 0,
  },
})
```

`prefetchLoadersBeforePageRender` only prefetches queries declared as
`.loader()` — their inputs come from the route, so they're always right. Queries
you injected with `.with()` take render-time inputs and are still discovered by
the render loop, so warm those in `.onPrefetchPage()` if you need them up front.

This way you have to understand that the code declared in `.onPrefetchPage()`
can be called both on the server and on the client. But there's no problem in
still writing `ideaViewQuery.prefetchQuery({ id: location.params.id })` there;
on the client the request will go to the server's address on the internet. And
if it is called on the client, then the same request, bypassing the network,
will go directly to `engine.fetch(request)` with all the headers, cookies, and
so on from the original client request preserved. (Need a warm-up that lives on
just one side, `.serverOnPrefetchPage()` / `.clientOnPrefetchPage()` are the
same hook with the other bundle's body stripped out.)

But honestly, I like just re-rendering many times, it's very convenient. I think
that if a project doesn't have a giant load, you won't even feel it. And if a
load appears, you can always add `.onPrefetchPage()` in especially sensitive
places and change the policy to
`.prefetchPageOnNavigate('serverAndClientQuery')`, without changing the rest of
the code.

We also have
`.on('engineFetchSettled', (event) => console.log(event.data.request.renders))`
which will tell you how many re-renders happened. You can set up metrics, and
fix things precisely in those places where there are many re-renders.

Read more in the docs [about SSR](ssr).

## SsrStore

And since we can do server-side re-rendering, let's go ahead and introduce a
server-side store right here too. I doubted whether it could even be useful at
all. But then I ran into this situation.

```tsx
import { create } from 'zustand/react'

const useBreadcrumb = create<{
  items: Array<[string, string]>
  setItems: (items: Array<[string, string]>) => void
}>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
}))

export const adminLayout = root.lets
  .layout('/admin')
  .layout(({ children }) => {
    const items = useBreadcrumb((state) => state.items)
    return (
      <div>
        <div id="header">
          <h1>Admin Panel</h1>
          <div id="breadcrumb">
            {items.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
        </div>
        <div id="content">{children}</div>
      </div>
    )
  })
  .layout()

export const adminUsersPage = adminLayout.lets
  .page('/users')
  .page(({ data: { idea } }) => {
    const setItems = useBreadcrumb((state) => state.setItems)
    useEffect(() => {
      setItems([
        ['Dashboard', '/admin'],
        ['Users', '/users'],
      ])
    }, [setItems])
    return (
      <div>
        <h1>{idea.title}</h1>
      </div>
    )
  })
```

It all works in general, but after the first render of the page, my breadcrumbs
were empty! And they only loaded once the js had loaded and they were computed.
I realized that we need an SsrStore. You might think it isn't worth it, and that
the issue could have been solved some other way. But I think we'll still find
good uses for SsrStore, so let these breadcrumbs just be an excuse to create
SsrStore.

```tsx
import { SsrStore } from '@point0/core/ssr-store'
import { useEffectSsr } from '@point0/core'

export const $breadcrumb = SsrStore.define<Array<[string, string]>>(
  // name of the item in the ssr store
  'breadcrumb',
  // function that returns the default value
  () => [],
)

export const adminLayout = root.lets
  .layout('/admin')
  .layout(({ children }) => {
    const items = $breadcrumb.use()
    return (
      <div>
        <div id="header">
          <h1>Admin Panel</h1>
          <div id="breadcrumb">
            {items.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </div>
        </div>
        <div id="content">{children}</div>
      </div>
    )
  })
  .layout()

export const adminUsersPage = adminLayout.lets
  .page('/users')
  .page(({ data: { idea } }) => {
    // this is a regular effect, it's just that during ssr it will be called instantly,
    // and on the client according to the rules of a normal useEffect
    useEffectSsr(() => {
      $breadcrumb.set([
        ['Dashboard', '/admin'],
        ['Users', '/users'],
      ])
    }, [])
    return (
      <div>
        <h1>{idea.title}</h1>
      </div>
    )
  })
```

Here's how it all works. We render the page. If the serialized value of the
store has changed, we re-render, and so on until it stabilizes. That is, you
shouldn't stuff a new Date() in there, or anything that fundamentally doesn't
serialize. Then the value is baked into index.html. And on the client, when the
breadcrumbs are requested, we already know the final computed value, and the
breadcrumbs are visible right away.

Note that the connection here is one-way. Data goes from the server to the
client, but doesn't go from the client to the server. When you use the store on
the client, it works just like a regular store. The connection in SsrStore is
one-way on purpose, because for a two-way connection between client and server
we use CookieStore.

I'll also note that you don't have to use SsrStore at all; if you don't need it,
it won't even make it into the client bundle.

Read more in the docs [about SsrStore](ssr-store).

## CookieStore

Generally, we can work with cookies even without CookieStore. Let me first show
how we work with them at a basic level:

```tsx
// auth — your authorization helpers
// that is, not part of the framework, but your code
import auth from '@/lib/auth'

export const signInMutation = root.lets
  .mutation()
  .input(z.object({ email: z.string(), password: z.string() }))
  .loader(async ({ input, set }) => {
    const { token, user } = await auth.signIn(input)
    set.cookies('token', token, {
      httpOnly: true,
    })
    return { user }
  })

export const updateProfileMutation = root.lets
  .mutation()
  .input(z.object({ name: z.string() }))
  .loader(async ({ input, request, set }) => {
    const token = request.cookies['token']
    const { user } = await auth.verifyToken(token)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: input.name },
    })
    return { user: updatedUser }
  })
  .mutation()
```

And for authorization things, it seems like it even works fine this way, but it
turns out we have to remember which key we wrote which cookie under. And
besides, I usually do authorization through better-auth, where it manages all of
this itself. Nevertheless, all of this could optionally be replaced with
CookieStore.

```tsx
const $token = CookieStore.define<string>({ name: 'token', httpOnly: true })

export const root = Point0.lets
  .root()
  // ...
  .plugin(CookieStore.plugin())
  // ...
  .root()

export const signInMutation = root.lets
  .mutation()
  .input(z.object({ email: z.string(), password: z.string() }))
  .loader(async ({ input, set }) => {
    const { token, user } = await auth.signIn(input)
    $token.set(token)
    return { user }
  })

export const updateProfileMutation = root.lets
  .mutation()
  .input(z.object({ name: z.string() }))
  .loader(async ({ input, request, set }) => {
    const token = $token.get()
    const { user } = await auth.verifyToken(token)
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: input.name },
    })
    return { user: updatedUser }
  })
  .mutation()
```

Here you may notice that we don't pass the request itself into $token, which you
would seemingly need in order to get the cookies. This happens because
CookieStore can pull the request from the environment itself, since the request
is stored in node async storage, which we use under the hood to wrap all the
code before the request starts executing.

Let's look at how to use CookieStore for cookies that are also used on the
client. For example, a dark or light theme.

```tsx
import { useHead } from '@unhead/react'
import { CookieStore } from '@point0/core/cookie-store'

type ColorMode = 'dark' | 'light'

export const $colorMode = CookieStore.define<ColorMode>('color-mode')

// Use it as a theme toggle button
export const ThemeSwitcher = () => {
  const colorMode = $colorMode.use()
  return (
    <button
      onClick={() => $colorMode.set(colorMode === 'dark' ? 'light' : 'dark')}
    >
      {colorMode}
    </button>
  )
}

// Stick this into app.client.tsx
export const ThemeProvider = () => {
  const colorMode = $colorMode.use()
  useHead({
    htmlAttrs: {
      class: {
        dark: colorMode === 'dark',
        light: colorMode === 'light',
      },
    },
  })
  return null
}
```

Now the server sends us html that already has the dark or light class, depending
on which color mode we set in the cookie. And on the client it works like a
regular reactive store.

CookieStore has more settings, and the ability to store non-primitives, as well
as to apply a transformer like superjson to them. Read more in the docs.

Like SsrStore, CookieStore is also an optional component, and if you don't use
it, it won't be included in the client bundle.

Read more in the docs [about CookieStore](cookie-store).

## Testing

Like any ordinary fullstack application, we can test it with playwright. To do
that we bring the app up in a dev environment, or build it and run it. Then it's
just regular playwright tests.

If you want to write integration tests without bringing up a server to test
endpoints, you can do it like this:

```ts
// src/test/setup/preload.int.test.ts

import { engine } from '@/engine'
await import('@/preload')

// This function makes the engine read the points loaded into it.
// In a normal server, when we call engine.serve(), this function is called automatically.
// But in integration tests we don't want to bring up a server, so we call this function manually.
// not to be confused with engine.preload(), these are different functions
await engine.prepare()

export {}
```

```
// bunfig.toml
// in reality it's better to have a separate ./src/test/setup/preload.ts
// which, depending on the test file's extension, will use the appropriate preload
// but for the example this will do for now
[test]
preload = ["./src/test/setup/preload.int.test.ts"]
```

```ts
// src/idea/api.ts

describe('ideaViewQuery', () => {
  test('returns one idea by id', async () => {
    const user = await createTestUser()
    const created = await seedIdea({ authorId: user.id, title: 'Viewable' })

    // engine.withFetch is a wrapper over node async storage, which lets you swap
    // the fetch for the points under the hood with engine.fetch
    const result = await engine.withFetch(async () => {
      return await ideaViewQuery.fetchServer({ id: created.id })
    })
    // here result is correctly typed, and is what the query's loader returned
    expect(result.idea.title).toBe('Viewable')
    expect(result.idea.author.id).toBe(user.id)
  })
})
```

Read more in the docs [about testing](testing).

## For fullstack developers, backenders, and frontenders alike.

Even though Point0 is a fullstack framework, nothing stops you from using it as
a frontend-only framework, or as a backend-only framework.

Frontenders can use navigation and the `.with()` helpers to manage the state of
their pages and components. They can write a BFF using ordinary
queries/mutations, or use client loaders to request data from a third-party
server.

If you are a backender and you only care about the API, then you can use actions
alone, with convenient OpenAPI generation, typed `.ctx()`, and tests without
spinning up a server.

Read more in the docs [about points](points).

## Bun or Vite

At first I wanted to make it specifically a Bun framework. And it was going
well. Then problems of all kinds started, and I thought I should probably allow
using Vite as an optional dependency. I hooked up Vite. Again there were
problems, but in the end Vite started working better than pure Bun inside
Point0. Then I gathered my strength and finished configuring Bun. And in the end
Bun started working better than Vite inside Point0. Bun starts faster, HMR works
better. How I fought with Bun and Vite is a topic for a separate post.

In the end the design turned out such that if one of the bundlers doesn't suit
you, you can switch to the other by changing a couple of files, and the runtime
behavior stays the same.

If you need to configure some build options for Bun, just add them in engine.ts:

```ts
import { Engine } from '@point0/engine'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss/vite'

export const engine = Engine.create({
  // ...
  bunBuildConfig: ({ side, mode, scope }) => ({
    // the standard Bun.buildConfig can be overridden here
    // mode - production | development | test depending on process.env.NODE_ENV
    // side - server | client depending on what we are building
    // scope - if you have several clients, here will be the name of the client/server root
  }),
  client: {
    // bunBuildConfig: {}
    // you can override here as well
  },
  server: {
    // bunBuildConfig: {}
    // you can override here as well
  },
})
```

If you want to switch from Bun to Vite, you need to pass `viteConfig` into
`engine.ts`. This replaces Bun with Vite in both build and dev mode.

```ts
import { Engine } from '@point0/engine'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss/vite'

export const engine = Engine.create({
  // ...
  viteConfig: ({ plugins, side, mode }) => ({
    // no additional settings are needed, they are inserted automatically
    // based on the other engine settings, but they can be overridden here.
    // This is a regular Vite config object.
    plugins: [
      ...plugins, // the Point0 compiler plugin is already here
      react(),
      tailwindcss(),
    ],
    // using side (client|server) you can override some settings
    // for the client or the server
  }),
  client: {
    // viteConfig: {}
    // you can override here as well
  },
  server: {
    // viteConfig: {}
    // you can override here as well
  },
})
```

Read more in the docs [about Bun or Vite](bun-vs-vite).

## Deploy

`point0 build` bundles everything into `dist/`: `dist/server` (the server) and
`dist/client` (the client bundle, static assets). Then we simply start the
server: `bun run ./dist/server/index.server.js`, which also serves the client.

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install && bun run build
CMD ["bun", "run", "./dist/server/index.server.js"]
```

That is, you can deploy absolutely anywhere, there is nothing specific here.

Read more in the docs [about deploy](deploy).

## Size

The size of Point0's files inside the client bundle.

- `@point0/core` itself: raw 143.4 KB, gzip 40.9 KB, brotli 36.2 KB
- Peer dependency `@1gr14/route0`: raw 15.0 KB, gzip 4.7 KB, brotli 4.2 KB
- Peer dependency `@1gr14/error0`: raw 3.6 KB, gzip 1.4 KB, brotli 1.3 KB
- Peer dependency `@tanstack/react-query`: raw 38.2 KB, gzip 15.9 KB, brotli
  14.2

## Examples

The repository has several examples:

- **basic** — a collective blog of ideas: SSR, Prisma + SQLite, Tailwind,
  navigation, pages/layouts/queries/mutations/components, an MDX page, file
  upload, OpenAPI
- **vite** — the same app, but the client is built with Vite instead of Bun.
- **better-auth** — the same collective blog, but with authorization hooked up
  through better-auth
- **capacitor** — packaging the web app into a mobile app (iOS/Android) via
  Capacitor. (experimental)
- **expo** — React Native via Expo: a single server on Bun, shared
  query/mutation code, and a native client with the Expo router. The server code
  is stripped from the bundle by the compiler's Babel plugin. (experimental)

But so you don't have to go far, I'll show one more piece of code right here,
from my production-ready boilerplate Start0, so that you can get a feel for the
code of a real project:

```ts
// src/features/idea/api.ts

import { paginateCursor } from '@/components/blocks/pagination'
import { AppError } from '@/lib/error'
import { root } from '@/lib/root'
import { zz } from '@/lib/schema'
import { authorizedOnlyPlugin } from '@/modules/auth/plugins'
import { prisma } from '@/modules/prisma'
import { ideaSelect, normalizeIdeaPayload } from '@/features/idea/server'
import { z } from 'zod'

export const ideaListQuery = root.lets
  .infiniteQuery()
  .input(
    z.object({
      ...zz.shape.paginationCursor,
      authorSn: zz.sn.optional(),
    }),
  )
  .loader(async ({ input: { limit = 20, cursor, authorSn } }) => {
    const items = await prisma.idea.findMany({
      select: ideaSelect,
      orderBy: { sn: 'desc' },
      take: limit + 1,
      where: {
        ...(authorSn ? { author: { sn: authorSn } } : {}),
        ...(cursor ? { sn: { lte: cursor } } : {}),
      },
    })
    return paginateCursor({
      items: items.map(normalizeIdeaPayload),
      limit,
      cursorKey: 'sn',
    })
  })
  .infiniteQuery({
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor,
    initialPageParam: undefined,
    pageParamFromInput: 'cursor',
  })

export const ideaViewQuery = root.lets
  .query()
  .input(zz.object.sn)
  .loader(async ({ input: { sn } }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      select: ideaSelect,
      where: { sn },
    })
    return { idea: normalizeIdeaPayload(idea) }
  })
  .query()

export const ideaCreateMutationSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
})
export const ideaCreateMutation = root.lets
  .mutation()
  .use(authorizedOnlyPlugin)
  .input(ideaCreateMutationSchema)
  .loader(async ({ ctx, input: { title, content } }) => {
    const idea = await prisma.idea.create({
      select: ideaSelect,
      data: { title, content, authorId: ctx.me.user.id },
    })
    return { idea: normalizeIdeaPayload(idea) }
  })
  .mutation()

export const ideaUpdateMutationSchema = z.object({
  sn: zz.sn,
  title: z.string().min(1),
  content: z.string().min(1),
})
export const ideaUpdateMutation = root.lets
  .mutation()
  .use(authorizedOnlyPlugin)
  .input(ideaUpdateMutationSchema)
  .loader(async ({ ctx, input: { sn, title, content } }) => {
    const existing = await prisma.idea.findUniqueOrThrow({
      select: { authorId: true },
      where: { sn },
    })
    if (existing.authorId !== ctx.me.user.id) {
      throw new AppError('Only the author can edit this idea', {
        code: 'FORBIDDEN',
      })
    }
    const idea = await prisma.idea.update({
      select: ideaSelect,
      where: { sn },
      data: { title, content },
    })
    return { idea: normalizeIdeaPayload(idea) }
  })
  .mutation()
```

```tsx
// src/features/idea/pages/list.tsx

import { InfiniteScroll } from '@/components/blocks/infinite-scroll'
import { Section } from '@/components/ui/section'
import { generalLayout } from '@/layouts/general'
import { IdeaCard } from '@/features/idea/components/idea-card'
import { ideaListQuery } from '@/features/idea/api'
import { mePlugin } from '@/modules/auth/plugins'

export const ideaListPage = generalLayout.lets
  .page('/ideas')
  .head('Ideas')
  .use(mePlugin)
  .page(({ props: { me } }) => {
    const query = ideaListQuery.useInfiniteQuery()
    return (
      <Section h1="Ideas">
        <InfiniteScroll
          query={query}
          loadMoreOnReachEnd
          getItemKey={(idea) => idea.sn}
          empty="No ideas yet. Be the first to share one."
          itemClassName="border-b border-border last:border-b-0"
          renderItem={(idea) => <IdeaCard idea={idea} me={me} />}
        />
      </Section>
    )
  })
```

```tsx
// src/features/idea/pages/view.tsx

import { Button } from '@/components/ui/button'
import { Prose } from '@/components/ui/prose'
import { Section } from '@/components/ui/section'
import { routes } from '@/generated/point0/routes'
import { Link } from '@/lib/navigation'
import { zz } from '@/lib/schema'
import { formatDate } from '@/utils/date'
import { generalLayout } from '@/layouts/general'
import { ideaViewQuery } from '@/features/idea/api'
import { isMyIdea } from '@/features/idea/shared'
import { mePlugin } from '@/modules/auth/plugins'

export const ideaViewPage = generalLayout.lets
  .page('/ideas/:sn')
  .params(zz.object.sn)
  .use(mePlugin)
  .with(ideaViewQuery, ({ params }) => ({ sn: +params.sn }))
  .head(({ params }) => `Idea #${params.sn}`)
  .page(({ data: { idea }, props: { me } }) => {
    return (
      <Section
        h1={idea.title}
        action={
          isMyIdea(idea, me) ? (
            <Button
              to={routes.ideaEdit({ sn: idea.sn })}
              variant="outline-secondary"
            >
              Edit idea
            </Button>
          ) : undefined
        }
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Link
              to={routes.userProfile({ sn: idea.author.sn })}
              className="hover:text-foreground"
            >
              {idea.author.name}
            </Link>
            <span>·</span>
            <span>{formatDate(idea.createdAt, 'date-time-nice')}</span>
            {idea.updatedAt > idea.createdAt ? (
              <span>· edited {formatDate(idea.updatedAt, 'date-nice')}</span>
            ) : null}
          </span>
        }
      >
        <Prose>
          <p className="whitespace-pre-wrap">{idea.content}</p>
        </Prose>
      </Section>
    )
  })
```

```tsx
// src/features/idea/pages/new.tsx

import { Section } from '@/components/ui/section'
import { routes } from '@/generated/point0/routes'
import { navigate } from '@/lib/navigation'
import { queryClient } from '@/lib/query-client'
import { generalLayout } from '@/layouts/general'
import { authorizedOnlyPlugin } from '@/modules/auth/plugins'
import { FButton } from '@/modules/form/core/button'
import { FFields, FFooter } from '@/modules/form/core/layout'
import { FForm } from '@/modules/form/core/provider'
import { FInput } from '@/modules/form/fields/input'
import { FTextarea } from '@/modules/form/fields/textarea'
import {
  ideaCreateMutation,
  ideaCreateMutationSchema,
  ideaViewQuery,
  ideaListQuery,
} from '@/features/idea/api'
import { getQueryPredicate } from '@point0/core'

export const ideaNewPage = generalLayout.lets
  .page('/ideas/new')
  .head('New Idea')
  .use(authorizedOnlyPlugin)
  .page(() => {
    return (
      <Section h1="New Idea">
        <FForm
          schema={ideaCreateMutationSchema}
          defaultValues={{ title: '', content: '' }}
          onSubmit={async ({ title, content }) => {
            const { idea } = await ideaCreateMutation.fetch({ title, content })
            void queryClient.invalidateQueries({
              predicate: getQueryPredicate({ id: ideaListQuery.id }),
            })
            ideaViewQuery.setQueryData({ sn: idea.sn }, { idea })
            return { idea }
          }}
          onSuccess={({ idea }) => {
            void navigate('ideaView', { sn: idea.sn }, { replace: true })
          }}
          toastOnSuccess="Idea published"
          size="sm"
        >
          <FFields>
            <FInput
              name="title"
              label="Title"
              placeholder="A short, catchy title"
              inputSize="xl"
            />
            <FTextarea
              name="content"
              label="Content"
              placeholder="Share your idea…"
              rows={10}
            />
          </FFields>
          <FFooter>
            <FButton type="submit" size="2xl">
              Publish
            </FButton>
          </FFooter>
        </FForm>
      </Section>
    )
  })
```

```tsx
// src/features/idea/pages/edit.tsx

import { Button } from '@/components/ui/button'
import { Section } from '@/components/ui/section'
import {
  ideaListQuery,
  ideaUpdateMutation,
  ideaUpdateMutationSchema,
  ideaViewQuery,
} from '@/features/idea/api'
import { routes } from '@/generated/point0/routes'
import { generalLayout } from '@/layouts/general'
import { navigate } from '@/lib/navigation'
import { queryClient } from '@/lib/query-client'
import { zz } from '@/lib/schema'
import { FButton } from '@/modules/form/core/button'
import { FFields, FFooter } from '@/modules/form/core/layout'
import { FForm } from '@/modules/form/core/provider'
import { FInput } from '@/modules/form/fields/input'
import { FTextarea } from '@/modules/form/fields/textarea'
import { getQueryPredicate } from '@point0/core'

export const ideaEditPage = generalLayout.lets
  .page('/ideas/:sn/edit')
  .params(zz.object.sn)
  .with(ideaViewQuery, ({ params }) => ({ sn: +params.sn }))
  .head(({ params }) => `Edit Idea #${params.sn}`)
  .page(({ data: { idea } }) => {
    return (
      <Section
        h1="Edit Idea"
        action={
          <Button
            to={routes.ideaView({ sn: idea.sn })}
            variant="outline-secondary"
          >
            View idea
          </Button>
        }
      >
        <FForm
          schema={ideaUpdateMutationSchema.pick({ title: true, content: true })}
          defaultValues={{ title: idea.title, content: idea.content }}
          onSubmit={async ({ title, content }) => {
            const { idea: updated } = await ideaUpdateMutation.fetch({
              sn: idea.sn,
              title,
              content,
            })
            ideaViewQuery.setQueryData({ sn: updated.sn }, { idea: updated })
            void queryClient.invalidateQueries({
              predicate: getQueryPredicate({ id: ideaListQuery.id }),
            })
            return { idea: updated }
          }}
          onSuccess={({ idea: updated }) => {
            void navigate('ideaView', { sn: updated.sn }, { replace: true })
          }}
          toastOnSuccess="Idea updated"
          size="sm"
        >
          <FFields>
            <FInput name="title" label="Title" inputSize="xl" />
            <FTextarea name="content" label="Content" rows={10} />
          </FFields>
          <FFooter>
            <FButton type="submit" size="2xl">
              Save
            </FButton>
          </FFooter>
        </FForm>
      </Section>
    )
  })
```

```tsx
// src/features/idea/pages/my.tsx

import { InfiniteScroll } from '@/components/blocks/infinite-scroll'
import { Section } from '@/components/ui/section'
import { ideaListQuery } from '@/features/idea/api'
import { IdeaCard } from '@/features/idea/components/idea-card'
import { generalLayout } from '@/layouts/general'
import { authorizedOnlyPlugin } from '@/modules/auth/plugins'

export const myIdeaListPage = generalLayout.lets
  .page('/my/ideas')
  .head('My Ideas')
  .use(authorizedOnlyPlugin)
  .with(ideaListQuery, ({ props: { me } }) => ({ authorSn: me.user.sn }))
  .page(({ queries: [query], props: { me } }) => {
    return (
      <Section h1="My Ideas">
        <InfiniteScroll
          query={query}
          loadMoreOnReachEnd
          getItemKey={(idea) => idea.sn}
          empty="You haven't shared any ideas yet."
          itemClassName="border-b border-border last:border-b-0"
          renderItem={(idea) => <IdeaCard idea={idea} me={me} />}
        />
      </Section>
    )
  })
```

Read more in the docs [about the basic example](example-basic).

## Production

At the moment this article is published, there is only one project in the world
that uses the Point0 framework in production. It is my site https://1gr14.dev

I am not going to change the design of how you interact with the framework. I am
absolutely happy with everything related to the builder of the points
themselves. I refactored it dozens of times, over many months, until I arrived
at what we have now.

It is possible that the structure of the `engine` config will change a little,
but if that happens, the changes in your projects will essentially be needed
only in the `engine.ts` file.

I have no idea when one can confidently recommend that you use Point0 in
production. I just don't know what the criteria are here. I am now going to
actively use it to build my own projects, as well as projects for my clients.

I created a production-ready boilerplate for SaaS called
[Start0](https://1gr14.dev/start0), which is built around Point0. I connected
and configured everything needed for it to build real projects. The stack is as
follows:

- Bun
- TypeScript
- Point0
- React
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Prisma
- better-auth
- TanStack Query
- TanStack Table
- Zod
- React Hook Form
- Resend
- Sentry
- Mixpanel
- LogTape
- Playwright
- Testing Library
- ESLint
- Prettier

More details here: https://1gr14.dev/start0

As I build my own projects and get feedback from you, I will keep improving this
boilerplate.

## Plans

Right now the focus is on stability. I will respond as quickly as possible to
any [issue on GitHub](https://github.com/1gr14/point0).

I am going to write guide articles on Habr on a regular basis, and record videos
on [YouTube](https://www.youtube.com/@s_1gr14) and
[VK Video](https://vkvideo.ru/@s_1gr14). All announcements will be in the
[community](https://1gr14.dev/community) on [Telegram](https://t.me/s_1gr14)
(Russian) and [Discord](https://discord.gg/hWgtn58FVv) (English).

After that, I want to finish realtime points that work over WebSocket, in the
same style as regular points. I also want to finish static site generation.

I really don't want to do React Server Components — I honestly don't understand
what benefit they could bring here. But if they do happen, I will essentially
just allow returning React elements from `.loader()`. But what the benefit of
that would be, I don't yet understand. Let's discuss this another time.

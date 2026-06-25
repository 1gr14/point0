---
index: 800
title: MDX
description:
  Author a page or content in .mdx — an ESM point head plus a Markdown body that
  renders through MDXContent.
---

An `.mdx` file is a normal point. The top is the usual ESM head — `import`s and
an `export const … = …` point chain; the bottom is a Markdown body. The chain
renders that compiled body through a component named `MDXContent`, into which it
spreads the page's render props. So you write the page chain you already know,
then keep typing prose under it.

```mdx
import { generalLayout } from '@/layouts/general'

export const page = generalLayout
  .lets('page', 'about', '/about')
  .head('About')
  .page((props) => (
    <div className="prose">
      <MDXContent {...props} />
    </div>
  ))

# About My App

My App is the best!
```

`/about` now renders that Markdown. The chain is an ordinary [page](page); the
only new thing is `<MDXContent {...props} />` — the bridge from the chain to the
body. The rest of this page shows where each piece comes from.

## The shape of an `.mdx` point

Two halves, in this order:

```mdx
import { Link } from '@/lib/navigation' // 1. ESM head: imports
import { generalLayout } from '@/layouts/general'

export const page = generalLayout // 2. the point chain (a page here)
  .lets('page', 'about', '/about')
  .head('About')
  .page((props) => (
    <div className="prose">
      <MDXContent {...props} /> // renders the body below
    </div>
  ))

# About IdeaNick // 3. the Markdown body

IdeaNick is a platform for creating and sharing ideas.
```

The chain is identical to a `.tsx` page —
`.lets(...).loader(...).head(...).page(...)`. The `.page` render fn receives
`props` and forwards them with `<MDXContent {...props} />`. Everything after the
chain (from the first `#` heading down) is the body, compiled to the component
you just rendered.

> Most apps wrap the body in a typography class — `<div className="prose">`
> (Tailwind Typography) above, or a `<Prose>` component — so plain Markdown gets
> readable styling. That wrapper is yours; Point0 adds none.

## `MDXContent` — where it comes from

`MDXContent` is **not** a Point0 symbol. It is the default export the MDX
compiler emits for every `.mdx` module. It is in scope inside the chain because
`*.mdx` is declared as a module whose default export is `MDXContent`:

```ts
// src/types/global.d.ts
declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const MDXContent: ComponentType<any>
  export default MDXContent
  export const page: unknown
  export const frontmatter: Record<string, unknown>
}
```

Three things an `.mdx` module is declared to export: `default` (= `MDXContent`),
`page` (your chain), and `frontmatter` (see [below](#frontmatter)).
`create-point0-app` and every example ship this `*.mdx` block; a hand-rolled app
needs it too, or the JSX scope won't know `MDXContent`.

## Props reach the body through `{...props}`

The body can read the page's `props` directly — but only because the render fn
spread them into `MDXContent`. The compiled `MDXContent` is a component
(`function MDXContent(props)`), and the body references that same `props`:

```mdx
export const page = generalLayout
  .lets('page', 'about', '/about')
  .loader(async () => {
    const lastIdea = await prisma.idea.findFirst({ orderBy: { id: 'desc' } })
    if (!lastIdea) throw new AppError('Last Idea Not Found :–(')
    return { lastIdea: { id: lastIdea.id, title: lastIdea.title } } // becomes props.data
  })
  .head('About')
  .page((props) => (
    <div className="prose">
      <MDXContent {...props} />{' '}
      {/* without this spread, props.data below is undefined */}
    </div>
  ))

# About IdeaNick

Fresh idea: <Link route="ideaView"
input={{ id: props.data.lastIdea.id }}>{props.data.lastIdea.title}</Link>
```

The body mixes Markdown with JSX freely — `<Link>`, `props.data.lastIdea.*`, any
imported component. `props.data` is the loader's return, exactly as in a `.tsx`
page; the full prop list (`data`, `params`, `search`, `props`, …) is on the
[page](page) page. Forget the `{...props}` spread and the body still compiles,
but `props` inside it is empty.

## Three extensions, one pipeline

`.md`, `.mdx`, and `.mdc` all compile the same way — the compiler detects them
by extension and precompiles each into a JS program before Babel runs (raw
Markdown isn't valid Babel syntax). After that the output is a normal module:
every Point0 source transform applies to it (see
[below](#point0-transforms-run-on-the-body)).

```tsx
// detection, in the compiler
;/\.(md|mdx|mdc)$/.test(path)
```

One pipeline, two intended uses:

- **`.mdx`** — a **page**. You write a point chain plus a Markdown body and
  render it through `<MDXContent {...props} />`, exactly as above. This is the
  case the rest of this page describes.
- **`.md` / `.mdc`** — plain Markdown you `import` for its content. Since the
  compiled module's default export is the `MDXContent` component and a YAML
  block becomes `export const frontmatter`, a plain
  `import Article, { frontmatter } from './post.md'` hands you both the rendered
  body and its metadata, to use however you like — no point chain required.

The extensions are not enforced apart in code: all three run through the same
`compileSync` call and produce the same module shape (`default` = `MDXContent`,
plus any `page` / `frontmatter` you export). The split above is convention, not
a compiler check — nothing stops a `.md` from carrying a `page` chain or an
`.mdx` from being imported for its body.

`.md` parses as MDX too (JSX-aware) unless you set `format: 'md'` in config
(plain CommonMark — see [Config](#config)). The page is called "MDX" but
`.md`/`.mdc` route through the same code.

## Frontmatter

A YAML frontmatter block compiles to an `export const frontmatter`:

```mdx
---
title: Privacy Policy
updated: 2025-01-01
---

# Privacy Policy
```

```ts
// the compiled module also exports:
export const frontmatter = { title: 'Privacy Policy', updated: '2025-01-01' }
```

The two frontmatter remark plugins are always on (`remark-frontmatter` +
`remark-mdx-frontmatter` named `frontmatter`), so no config is needed for this.
It's a plain module export — Point0 does **not** auto-feed it into `.head()` or
anything else; import and use it yourself.

## Discovery: include `mdx` in `pointsGlob`

The compiler treats `.mdx` as a point, but the engine only finds it if
`pointsGlob` matches it. Add the extension:

```tsx
export const engine = Engine.create({
  pointsGlob: '**/*.{ts,tsx,mdx}', // without mdx, the .mdx page is never discovered
  // ...
})
```

This is the one easy-to-miss setup step. `create-point0-app` already ships
`'**/*.{ts,tsx,mdx}'`; if you copy a leaner glob, widen it. Editing an `.mdx`
body in dev hot-swaps without a server restart — the dev watcher follows the
real import graph, not the glob, so a reachable `.mdx` page updates in place.

## Point0 transforms run on the body

Because the MDX output is re-parsed as a normal module, the standard Point0
transforms apply **inside the Markdown body** — it is first-class source, not
inert text:

```mdx
# Status

{env.side.is.client ? 'client' : 'server'}
{/* env tree-shaken per side at build */}

<ClientOnly>
  <span>browser-only content</span> {/* stripped from the server render */}
</ClientOnly>
```

So [`env`](env) shaking and server-side [`<ClientOnly>`](env) stripping work in
the body exactly as in a `.tsx` file. The same rule as in `.tsx` holds: the
browser bundle is public, so don't put secret content in Markdown expecting it
to stay private — server-only code is stripped at compile time, but anything
that survives into the render output ships to the client. Gate access in
[`.with`](with), not on render output.

## Dev vs build runtime

You don't configure this, but it's worth knowing: the compiler forces the MDX
`development` flag from the build state — `react/jsx-dev-runtime` while
developing, `react/jsx-runtime` in a production build. A user `markdown` config
can override most fields, but **not** `development`; build state always wins.
React must be the runtime either way (the compiler emits `jsx-runtime` calls,
not raw JSX).

## Config

App authors tune MDX through the engine's `compiler.markdown` option. It's the
full `@mdx-js/mdx` `CompileOptions`, except the three plugin arrays also accept
string paths and `[path, options]` tuples (not just live function refs):

```tsx
export const engine = Engine.create({
  // ...
  server: {
    compiler: {
      markdown: {
        format: 'md', // parse .md/.mdx as plain CommonMark instead of MDX
        remarkPlugins: [
          'remark-gfm', // a string path — require()d for you
          ['remark-toc', { tight: true }], // a [path, options] tuple
        ],
      },
    },
  },
})
```

Merge rules, from highest precedence to lowest:

- **Scalar fields** (`format`, `outputFormat`, …) are last-write-wins: a server-
  or client-specific `markdown` overrides the general one.
- **Plugin arrays** are **concatenated, never replaced** — the framework
  defaults (the two frontmatter plugins) come first, then general config, then
  specific. You can only add plugins, not drop the defaults.
- `development` is not overridable (see above).

`markdown` exists at the general, server, and client compiler levels, so you can
run a different plugin set per side.

All three plugin arrays — `remarkPlugins`, `rehypePlugins`, `recmaPlugins` — are
merged and concatenated the same way, and accept the string-path / tuple forms.

## Reference

### Default compile options

The compiler's standalone defaults (before your `markdown` config and the forced
`development`):

| Option          | Default                                                              | Note                                                          |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| `jsx`           | `false`                                                              | emits `react/jsx-runtime` calls, not raw JSX                  |
| `outputFormat`  | `'program'`                                                          | full ESM module with the `MDXContent` default export          |
| `format`        | `'mdx'`                                                              | JSX-aware; set `'md'` for plain CommonMark                    |
| `development`   | forced `!built`                                                      | dev-runtime in dev, prod-runtime in a build — not overridable |
| `remarkPlugins` | `remarkFrontmatter`, `remarkMdxFrontmatter({ name: 'frontmatter' })` | always prepended                                              |

### Module exports of an `.mdx` point

| Export        | What it is                                          |
| ------------- | --------------------------------------------------- |
| `default`     | `MDXContent` — the compiled Markdown body component |
| `page`        | your point chain (`export const page = …`)          |
| `frontmatter` | the YAML frontmatter object, or absent if no block  |

### Failure modes

- **Empty compile output** is a hard error:
  `Failed to compile MDX/MDC file <abs>, empty content`.
- **No `{...props}` spread** into `MDXContent` → the body's `props` is empty (no
  type error, just missing data).
- **`pointsGlob` without `mdx`** → the page is never discovered.

### Passing through to `@mdx-js/mdx`

A couple of things the underlying MDX compiler allows but Point0 does not wire
itself:

- **`components` / `wrapper` on `MDXContent`.** The compiled `MDXContent`
  accepts the standard MDX `components` map (and `wrapper`) to override how
  Markdown elements render. Reaching for it means relying on `@mdx-js/mdx`
  behavior directly.

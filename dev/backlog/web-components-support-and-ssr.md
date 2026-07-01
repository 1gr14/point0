# Web components: current story is "works, but only on the client" — decide & document (or SSR them properly)

**Status:** open · **Area:** react-dom / engine SSR / docs · **Trigger:** a user
asked "does point0 support web components?" and an AI handed them nonsense
(`lit-html` returned from a "React" component). We built a throwaway example to
find out, learned the real shape, then deleted it. This note is the residue.

## What we learned (verified 2026-07-01, examples/basic)

Web components are a **browser standard** (Custom Elements + Shadow DOM +
`<template>`), not a framework feature. point0 has **no special support** — and
mostly doesn't need any, because the DOM layer is **React 19**, which renders
custom elements natively. So you use them exactly as in any React 19 app: write
the tag in JSX. Two things bite, both confirmed by actually running it:

### 1. SSR crashes unless the class is guarded

`class X extends HTMLElement` evaluates the `extends` clause at **module load**,
and `HTMLElement` does not exist on the Bun server. So merely importing an
element module during SSR throws and 500s the whole page:

```
ReferenceError: HTMLElement is not defined
    at .../x-counter...tsx:12  (class XCounter extends HTMLElement)
```

Guarding only `customElements.define` is **not enough** — the class declaration
itself must be browser-only:

```ts
if (typeof window !== 'undefined' && !customElements.get('x-counter')) {
  class XCounter extends HTMLElement {
    /* ... connectedCallback builds shadow DOM ... */
  }
  customElements.define('x-counter', XCounter)
}
```

### 2. Even when guarded, the element renders EMPTY from the server

After the guard the page renders, and the tag reaches the markup — but its
content does not. Raw server HTML (first byte, == what no-JS sees):

```html
<x-counter start="3"></x-counter>
<!-- empty: no button, no count -->
```

The visible UI lives in Shadow DOM built imperatively in `connectedCallback`,
which runs **only in the browser** (server has no `customElements`, never
upgrades the element). So:

|                    | React component           | imperative custom element |
| ------------------ | ------------------------- | ------------------------- |
| markup from server | real HTML                 | empty tag                 |
| no-JS              | content visible           | **nothing**               |
| after hydration    | already there, "wakes up" | content appears only here |

Client side everything works: element upgrades, shadow DOM builds, and a
`CustomEvent('countchange')` is picked up by React via a `ref` +
`addEventListener` (custom events are not `onX` props). Verified end-to-end in a
real browser (click → count 3→5 → React state 5).

### TS gotcha worth remembering

The JSX augmentation for a custom tag MUST live in a **module** file (one with a
top-level `import`/`export`). In a non-module script,
`declare module 'react' { namespace JSX { … } }` declares a _new ambient_
`react` module instead of _augmenting_ `@types/react` — which silently **wipes
every real react export program-wide** (`useState`, `ReactNode`, … all become
"no exported member", and point0's chain inference cascades to `any`). Fix: add
`export {}` to the augmentation file. (This one cost us a wrong "the example
isn't bootstrapped" diagnosis before we found it.)

## The two open directions

1. **Investigate & document how web components actually behave with our stack,**
   then write it down (candidate: `docs/core/web-components.md`, next to
   `ssr.md` / `mdx.md`). Nail the exact React-19 prop rules under our
   compiler/SSR (primitive → attribute, object → property when the property
   exists), custom events, the `typeof window` registration pattern, and the
   "empty on the server" reality — so we can point people at one page instead of
   them getting AI-hallucinated `lit-html` snippets.

2. **Make web components render nicely from the server too.** Today they're
   client-only. To get content into the SSR markup we'd need **Declarative
   Shadow DOM** — emit `<template shadowrootmode="open">…</template>` inside the
   tag on the server so the element has content before (and without) JS. That
   means either: a documented recipe for authoring elements that support DSD, or
   engine-level help (e.g. a way to register/serialize element-provided DSD
   during SSR, à la lit-ssr). Open question whether this is worth first-class
   support or stays a "here's how, you're on your own" recipe — depends on real
   demand. For now the honest guidance is: web components for client-only
   widgets = fine; content that matters for SSR/SEO/no-JS = use a React
   component.

## Repro sketch (deleted example)

The throwaway lived at `examples/basic/src/other/web-component/` — a native
`<x-counter>` (shadow DOM, `+1` button, `countchange` event) + an off-menu
`generalLayout.lets.page('/other/web-component')` that rendered it and read the
event into React state. Rebuild from the snippets above if needed.

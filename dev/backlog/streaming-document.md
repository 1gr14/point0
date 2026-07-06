# Stream the whole document — drop the `display: contents` wrapper hack

Standalone backlog — post-merge work, its own session.

Today streamed SSR renders the app into an `index.html` TEMPLATE: the engine
splits the template into prefix/suffix around `#root`, renders only the app
subtree with React, and pumps it between the two halves. That forces the
`<div data-point0 style="display:contents">` wrapper hack: when the FIRST
markup-producing mountable suspends, the pending Suspense boundary would be the
ROOT of React's markup, and Fizz withholds the entire response until it resolves
(a root-level boundary may still contribute preamble/head content, so the shell
cannot commit). A host div around the tree pins the host context and streaming
works — but it is a hack: an extra self-identifying div inside `#root`,
`#root > *` selectors affected, and a permanent "why is this here" for every
user who inspects the DOM.

The top frameworks don't have this problem because React OWNS the document:
Next.js (app router) and Remix render `<html>/<head>/<body>` from React itself —
`renderToReadableStream` receives the whole document tree, Fizz manages the
preamble natively, and a root-level Suspense boundary is never the markup root
(the `<body>` is). Investigate moving point0 to that model for SSR:

- **Render the document from React**: build the `<html>` tree from the parsed
  index.html template (or a user-provided Document component later) so the app
  root sits inside a React-rendered `<body>` — no wrapper div needed, Fizz
  streams natively, `<head>` management can move from string-splicing
  (prefix/suffix + unhead transforms + charset juggling in render.ts) into
  React's own head hoisting.
- What this unlocks/simplifies: the manual prefix/suffix pump collapses (React
  emits the whole document), the charset-first hack, script extract/restore
  machinery, and `fillRootElement` regexes in render.ts likely all go away; the
  push-hydration `<script>` injection needs a new insertion point (React 19
  supports injecting into the stream per flush — verify).
- What to keep compatible: `index.html` as the AUTHORING format (users keep
  editing a plain html file; the engine parses it into the document tree), vite
  dev-server HTML transforms, `mount()` hydration parity (hydrate the document
  or keep hydrating `#root` — decide), the dehydrated-store script placement
  rules (first 1024 bytes charset window), bootstrapModules.
- Prior art to study: Next app-router's Document handling, Remix's
  `entry.server` + `<Scripts/>`, TanStack Start's router-owned document — steal
  the best shape. The goal: be in line with the best frameworks here, no DOM
  artifacts.
- Once landed: remove the `data-point0` wrapper from render.ts + mount.ts +
  `HtmlView`'s display:contents skip in test utils, and the "HTML realities"
  caveat in dev/docs/suspend.md.

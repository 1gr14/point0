# Point0 — Documentation Plan & Authoring Guide

This is the **maintainer playbook** for documenting Point0 for its public
launch. It defines what the public docs (`docs/`) should contain, the rules for
writing them, and the live coverage tracker. It is written so that **any agent —
one or many — can open this file, pick an article, and write it** without extra
context.

Companions in `dev/`:

- [`structure.md`](./structure.md) — the canonical short structure (category →
  article slug). **It is the source of truth for the article list**; this tracker
  is rebuilt from it.
- [`writing-docs.md`](./writing-docs.md) — how to write one article (+ the review
  loop). Binding.
- [`plan-of-work.md`](./plan-of-work.md) — how we orchestrate the whole effort.
- [`overview.md`](./overview.md) — a code-first overview of the framework and the
  reference for tone/format.

- **Audience of this file:** us (maintainers) and doc-writing agents.
- **Audience of the docs we plan here:** Point0's users.
- **Language:** all docs are written in **English**.
- **Maturity:** Point0 ships at **v1** (already on npm). Write the docs as a
  stable, ready framework — confident, not an early preview — while staying
  accurate.
- **Paths** below are relative to the repo root (`point0/`).
- **Formatting:** this file is in `.prettierignore` on purpose — the tracker
  below is hand-formatted. Keep the per-article block shape; don't let a
  formatter reflow it.

---

## Read first — this plan is provisional

This plan and [`dev/overview.md`](./overview.md) were drafted by an AI agent from
a sweep of the code, examples, and tests, **before a big code refactor**. So two
warnings: the drafter may not have grasped the framework's real advantages, and
the **sources/titles below are pre-refactor and will have drifted**. Treat both
files as living drafts, not a spec:

- **Verify, don't trust.** Before you write, confirm against the **current** code
  and tests that the topic works the way this plan implies. The code wins.
- **Fix the plan as you learn.** When you find the plan got something wrong — a
  `title`, the `sources`, the scope, a gotcha, even the framing in
  `dev/overview.md` — correct it in the same change. Leave the next writer a
  better map than you found.
- **Find the essence, then confirm it.** Each topic has one core idea. Distill
  it, and check with Sergei that you read it right before you build the article
  around it. Then lead with it so the reader gets it fast — we're after
  understanding, not an API list.
- **Keep finding what's good.** As you write, you'll spot capabilities the
  overview/plan missed. Add them — to `dev/overview.md`'s "A few more nice things"
  and the positioning notes here. If we don't describe what's genuinely good, no
  one will. (See `dev/writing-docs.md` → "Believe the framework".)

---

## How to use this file (the tracker workflow)

1. Read [`dev/writing-docs.md`](./writing-docs.md) — the authoring principles.
   They are binding.
2. Open the **Coverage tracker**, pick an article with `status: ⬜` (do
   `priority: 0` before `1` before `2`; skip `priority: 99` — those are Sergei's).
3. Set its `status:` to `🟡` (add your name/agent after it if useful).
4. Read that article's `sources:` (re-verify them against the current code), then
   **run the app and watch the behavior** (`cd examples/basic && bun run dev`).
5. Distill the topic's one core idea, confirm it with Sergei, then draft the
   article into `docs/<category>/<slug>.md` per the principles. Add JSDoc to that
   feature's public API in the same change (Track B).
6. If you learned the plan was wrong, **fix this file, `dev/structure.md`, and
   `dev/overview.md`** in the same change.
7. Get it reviewed via the review loop in `dev/writing-docs.md` (post it in
   Russian in the chat). Set `status:` to `🔵` when drafted, `✅` when signed off.

Do **not** invent API. If you cannot find a behavior in the code or a test,
don't document it — leave a `TODO:` marker and move on.

---

## How we write

The full authoring guide — voice, article structure, examples-first, accuracy,
frontmatter, the review loop, the `TODO:` marker, and the definition of done —
lives in [`dev/writing-docs.md`](./writing-docs.md). Read it before you write.

In one line: **brevity, clarity, and everything shown through examples.** Docs
are examples with a thread of prose, not prose with a few examples.

---

## Category structure

Derived from [`dev/structure.md`](./structure.md) (the canonical list). A
**slug** is the article's file name (unique site-wide); the **category** is just
the folder. Hub pages in `concepts` (`points`, `methods`, …) index the detail
pages in the `points`/`methods` sections — keep the hub a short map, the detail
page the manual.

| #   | Category        | Slug        | What it covers                                          |
| --- | --------------- | ----------- | ------------------------------------------------------- |
| 1   | Introduction    | `intro`     | What/why, install, project shape (**Sergei writes these**) |
| 2   | Concepts        | `concepts`  | How it works: engine, compiler, points, methods, ssr, navigation, cli… |
| 3   | Building blocks | `blocks`    | env, stores, head, events, request, effects, mdx, plugins |
| 4   | Points          | `points`    | One page per point type (page, query, mutation, layout, …) |
| 5   | Methods         | `methods`   | One page per big reused method (loader, with, wrapper, middleware) |
| 6   | Packages        | `packages`  | openapi, basic-auth, cors, docs                         |
| 7   | Guides          | `guides`    | Recipes: auth, uploads, testing, deploy                 |
| 8   | Examples        | `examples`  | Showcase pages per example app                          |

---

## Coverage tracker

**status:** `⬜` todo · `🟡` drafting · `🔵` in review · `✅` done.
**priority:** `0` launch-critical · `1` soon after · `2` advanced/later · `99`
Sergei owns it (agents skip).

**Progress:** 0 / 52 done · priority 0: 0/11 · priority 1: 0/25 · priority 2: 0/12
· priority 99: 0/4 (Sergei).

Each article is a block (`slug`, `title`, `priority`, `status`, `sources`). To
claim one, set its `status` and update the counts above. **Sources are
best-effort and pre-refactor — verify them against the current code.**

### 1. Introduction — `intro` (Sergei writes these)

- slug: `overview`
  title: What Point0 is, the point model, a quick tour.
  priority: 99
  status: 🔵 — agent draft at docs/intro/overview.md; Sergei to review/rewrite
  sources: `dev/overview.md`, `docs/intro/overview.md`

- slug: `getting-started`
  title: Scaffold with create-point0-app, install, run dev, first edit.
  priority: 99
  status: ⬜
  sources: `packages/create-app/src/index.ts`, `packages/engine/src/cli.ts`

- slug: `project-structure`
  title: File layout; generated vs hand-authored; the Vite-vs-pure-Bun differences.
  priority: 99
  status: ⬜
  sources: `examples/basic/src/`, `examples/vite/`, `examples/basic/src/generated/point0/`

- slug: `why-point0`
  title: The problem it solves; when to reach for it.
  priority: 99
  status: ⬜
  sources: `dev/overview.md`

### 2. Concepts — `concepts`

> Hubs: a concept page is a short map (what exists, when to use which, golden
> example, links out). Depth lives in the `points`/`methods`/`blocks` pages.

- slug: `points`
  title: The point model — all point types, when to use each, and mountables (page/layout/component/provider go into JSX). Links to each point page.
  priority: 0
  status: ⬜
  sources: `packages/core/src/point0.ts`, `packages/core/src/types.ts`, `examples/basic/`

- slug: `methods`
  title: The key reused methods (`.loader()`, `.input()`, …) — which points use them and that they mean the same thing everywhere. Links to each method page.
  priority: 1
  status: ⬜
  sources: `packages/core/src/point0.ts`, `examples/basic/`

- slug: `engine`
  title: What the engine is — config + runtime in one object; its public methods.
  priority: 0
  status: ⬜
  sources: `packages/engine/src/engine.ts`, `packages/engine/src/config.ts`, `examples/basic/src/engine.ts`

- slug: `compiler`
  title: What we compile and why; how it's configured (side/scope shaking, virtual modules).
  priority: 1
  status: ⬜
  sources: `packages/compiler/src/compiler.ts`, `packages/compiler/src/walker.ts`

- slug: `generator`
  title: What we generate and why; the generated index is runtime-only (types stay fast).
  priority: 1
  status: ⬜
  sources: `packages/engine/src/generator.ts`, `examples/basic/src/generated/point0/`

- slug: `validation`
  title: Schemas are always object schemas; schema helpers; the validation methods and where they can't be mixed.
  priority: 1
  status: ⬜
  sources: `packages/core/src/schema/`, `examples/basic/src/lib/idea.ts`

- slug: `error-handling`
  title: AppError from error0 plugins; serialization; the in-chain error UI.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/lib/error.ts`, `packages/core/src/error.ts`, `examples/basic/src/lib/root.tsx`

- slug: `ssr`
  title: How SSR works — on or off both just work; prefetch-by-render and the `ssr` options; `clientOnly`.
  priority: 0
  status: ⬜
  sources: `packages/engine/src/config.ts` (SsrOptions), `packages/react-dom/src/mount.ts`, `examples/basic/src/engine.ts`

- slug: `navigation`
  title: How we build navigation and then work with it (typed links, navigate, transitions).
  priority: 0
  status: ⬜
  sources: `examples/basic/src/lib/navigate.ts`, `packages/react-dom/src/router.tsx`, `packages/core/src/navigation.tsx`

- slug: `cli`
  title: The `point0` CLI — every command and its flags.
  priority: 0
  status: ⬜
  sources: `packages/engine/src/cli.ts`

- slug: `mcp`
  title: The `point0-project` MCP server — what it exposes to agents.
  priority: 2
  status: ⬜
  sources: `packages/engine/src/mcp.ts`

- slug: `workflow`
  title: The dev workflow — `point0 dev`, watch, what just works from the CLI.
  priority: 1
  status: ⬜
  sources: `packages/engine/src/server.ts`, `packages/engine/src/client.ts`, `packages/engine/tests/dev.test.ts`

### 3. Building blocks — `blocks`

- slug: `env`
  title: The typed env helper — server/client sides, validation, branching.
  priority: 1
  status: ⬜
  sources: `packages/core/src/env.ts`, `examples/basic/src/lib/env.ts`

- slug: `ssr-store`
  title: Reactive SSR store — set state during SSR, it transfers to the client.
  priority: 1
  status: ⬜
  sources: `packages/core/src/ssr-store.ts`, `packages/core/src/super-store.ts` (SuperStore is the internal primitive — don't document it for users)

- slug: `head`
  title: `.head(...)` per point and global; unhead composition.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/lib/root.tsx`, `examples/basic/src/pages/home.tsx`, `@point0/core/unhead`

- slug: `cookie-store`
  title: Reactive cookie-backed store (`@point0/core/cookie-store`).
  priority: 1
  status: ⬜
  sources: `packages/core/src/` (cookie-store), `packages/core/tests/`

- slug: `events`
  title: The eventer — `.on(...)`, event names, log-safe meta.
  priority: 2
  status: ⬜
  sources: `packages/core/src/eventer.ts`, `packages/core/tests/eventer.test.ts`

- slug: `mdx`
  title: Authoring pages and content in MDX.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/pages/about.mdx`, `packages/compiler/src/file.ts`

- slug: `request`
  title: Our request object — where and how it's available in points and globally.
  priority: 1
  status: ⬜
  sources: `packages/core/src/` (grep `Request0`)

- slug: `effects`
  title: Response effects — how they're available globally.
  priority: 2
  status: ⬜
  sources: `packages/core/src/` (response effects)

- slug: `plugins`
  title: Local plugins — written in your own code, mounted anywhere.
  priority: 1
  status: ⬜
  sources: `packages/core/src/point0.ts` (plugin point), `examples/basic/src/lib/root.tsx`

### 4. Points — `points`

> One page per point type. Verify the exact set against the final code after the
> refactor. Fine to reuse and link to other points; don't over-repeat.

- slug: `root`
  title: The root point — global config; everything descends from it.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/lib/root.tsx`, `packages/core/src/point0.ts`

- slug: `base`
  title: `base` — a reusable, partially-configured ancestor.
  priority: 2
  status: ⬜
  sources: `packages/core/src/point0.ts`

- slug: `page`
  title: The page point — route, loader, params/search, render.
  priority: 0
  status: ⬜
  sources: `examples/basic/src/pages/home.tsx`, `examples/basic/src/pages/idea-view.tsx`, `packages/react-dom/src/router.tsx`

- slug: `layout`
  title: The layout point — wrap and nest pages; provide values down the tree.
  priority: 0
  status: ⬜
  sources: `examples/basic/src/layouts/general.tsx`, `examples/basic/src/layouts/idea.tsx`

- slug: `component`
  title: The component point — a mountable with its own loader/wrapper/props (`.X`).
  priority: 1
  status: ⬜
  sources: `examples/basic/src/pages/home.tsx` (ideaBestComponent), `packages/core/src/mountable.ts`

- slug: `provider`
  title: The provider point — supply a value down the tree (`.useValue()`).
  priority: 1
  status: ⬜
  sources: `packages/core/src/mountable.ts`, `examples/basic/src/layouts/idea.tsx`

- slug: `query`
  title: The query point — server loader, `useQuery`/`fetchQuery`, cache helpers; a real endpoint.
  priority: 0
  status: ⬜
  sources: `examples/basic/src/lib/idea.ts`, `examples/basic/src/pages/idea-view.tsx`

- slug: `infinite-query`
  title: The infinite-query point — `getNextPageParam`, `pageParamFromInput`, `fetchNextPage`.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/pages/idea-list.tsx`

- slug: `mutation`
  title: The mutation point — `useMutation`/`mutateAsync`, `onSuccess`, `setQueryData`.
  priority: 0
  status: ⬜
  sources: `examples/basic/src/pages/idea-create-update.tsx`

- slug: `action`
  title: The action point — a bare HTTP endpoint (no React binding); extra terminal options.
  priority: 1
  status: ⬜
  sources: `packages/core/src/point0.ts` (grep `action`), `examples/`

### 5. Methods — `methods`

> One page per big reused method. Concepts link here. If few land here, fold into
> `blocks`.

- slug: `loader`
  title: `.loader()` (and `clientLoader`/`mapper`) — how it behaves in each point.
  priority: 0
  status: ⬜
  sources: `examples/basic/src/pages/idea-list.tsx`, `packages/core/src/point0.ts`

- slug: `with`
  title: `.with(fn)` and `.with(point, mapper)` — compose data and flow without subcomponent sprawl.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/pages/idea-view.tsx`, `examples/basic/src/layouts/idea.tsx`

- slug: `wrapper`
  title: `.wrapper(...)` — wrap a mountable's children.
  priority: 2
  status: ⬜
  sources: `examples/basic/src/pages/home.tsx` (ideaBestComponent)

- slug: `middleware`
  title: `.middleware(...)` — mount any endpoint (Better Auth, OpenAPI, CORS) with no point.
  priority: 1
  status: ⬜
  sources: `examples/basic/src/lib/root.tsx`, `packages/engine/src/server.ts`

### 6. Packages — `packages`

- slug: `openapi`
  title: `@point0/openapi` — spec + Scalar/Swagger + filters.
  priority: 1
  status: ⬜
  sources: `packages/openapi/src/middleware.ts`, `examples/basic/src/lib/root.tsx`

- slug: `basic-auth`
  title: `@point0/basic-auth` middleware.
  priority: 1
  status: ⬜
  sources: `packages/basic-auth/src/index.ts`, `examples/basic/src/lib/root.tsx`

- slug: `cors`
  title: `@point0/cors` middleware.
  priority: 2
  status: ⬜
  sources: `packages/cors/src/index.ts`

- slug: `docs`
  title: `@point0/docs` — searchable markdown docs.
  priority: 2
  status: ⬜
  sources: `packages/docs/src/search.ts`

### 7. Guides — `guides`

- slug: `better-auth`
  title: Better Auth integration, end to end.
  priority: 1
  status: ⬜
  sources: `examples/better-auth/`, `packages/basic-auth/src/index.ts`

- slug: `uploads`
  title: Forms, file inputs, multipart.
  priority: 2
  status: ⬜
  sources: `examples/basic/src/pages/idea-create-update.tsx`, `examples/basic/src/ui/`

- slug: `testing`
  title: Testing points, pages, the engine (incl. `engine.fetch` without a server).
  priority: 2
  status: ⬜
  sources: `packages/react-dom/tests/`, `packages/engine/tests/`, `packages/core/tests/`

- slug: `deployment`
  title: Docker, single-server deploy.
  priority: 2
  status: ⬜
  sources: `examples/basic/Dockerfile`, `examples/basic/docker-compose.yml`

### 8. Examples — `examples`

- slug: `basic`
  title: The canonical app, end to end.
  priority: 0
  status: ⬜
  sources: `examples/basic/`

- slug: `vite`
  title: The Vite variant.
  priority: 1
  status: ⬜
  sources: `examples/vite/`

- slug: `better-auth`
  title: Auth variant.
  priority: 1
  status: ⬜
  sources: `examples/better-auth/`

- slug: `expo`
  title: Expo / mobile variant.
  priority: 2
  status: ⬜
  sources: `examples/expo/`

- slug: `capacitor`
  title: Capacitor variant.
  priority: 2
  status: ⬜
  sources: `examples/capacitor/`

---

## Priority-0 launch checklist

The minimum credible set for a public launch. The `intro/*` ones are Sergei's;
the rest are agent-writable:

- `intro/overview` · `intro/getting-started` · `intro/project-structure` (Sergei)
- `concepts/points` · `concepts/engine` · `concepts/ssr` · `concepts/navigation` · `concepts/cli`
- `points/page` · `points/query` · `points/mutation` · `points/layout`
- `methods/loader`
- `examples/basic`

---

## Track B — code comments (docs-in-comments)

The second launch workstream: comment the **public** surface so editors, type
hovers, and agents explain Point0 inline. Do it **inside the same change** as the
matching article (see `dev/writing-docs.md` → "Document and comment together").

**Conventions**

- **TSDoc/JSDoc** on public exports. `prettier-plugin-jsdoc` is configured, so
  formatting is automatic on save/commit.
- Document **what it is + when to use it**, plus `@example` where it earns one.
- **Public surface only.** Skip internals and never comment generated code
  (`examples/*/src/generated/point0/*`).
- Keep it in sync with the matching article — the comment is the short version,
  the article is the long version.

**Targets** (own track):

- target: `@point0/core` — builder methods (`point0.ts`), public types
  (`types.ts`), `schema/`, `env`, `error`, stores, `navigation`.
- target: `@point0/engine` — `config.ts` options, `cli.ts` commands, `engine.ts`
  public methods.
- target: `@point0/react-dom` — `router.tsx` (`Link`/`NavLink`/`createNavigation`),
  `mount.ts`.
- target: `@point0/compiler` — plugin entry points (`plugin/bun.ts`,
  `plugin/vite.ts`), `Compiler.create`.
- target: packages — `openapi`, `basic-auth`, `cors`, `create-app`, `docs`.

> Per AGENTS.md: don't read `core/src/point0.ts` (~12.7k lines) in full — use
> Serena / symbol search to comment methods in place.

---

## Open questions / decisions

- **Verify after the refactor.** This tracker was built before Sergei's code
  refactor. The point/method set, file paths, and some titles will have moved —
  re-derive from `dev/structure.md` and the current code when you start.
- **Positioning — describe plainly, no slogan.** Don't push a coined term
  ("eversion" or similar). Let concrete, demoable differences carry it: data
  points (query/mutation/action) are real endpoints with a path + OpenAPI;
  Bun-native (runs on pure Bun, Vite optional); built-in in-chain loading/error;
  SSR that just works and toggles with no code change; one composable,
  statically-collected `point` for the whole app, visible to you and to tools.
- **`docs/categories.json`.** Expand it lazily — add a category the first time one
  of its articles lands.
- **Replace the fake docs.** `docs/intro/overview.md` is done (real draft);
  `docs/intro/getting-started.md` and `docs/examples/*` are still placeholder —
  delete/replace them when the real articles land.

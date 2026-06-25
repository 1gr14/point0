# Point0 docs — how they work, how to write them

Everything to know before touching `docs/`. Written after the first full pass that
produced the 61 user-facing pages. Read this, then trust the code over any prose.

## What & where

- **`docs/`** holds the user-facing documentation — **61 markdown pages** across 7
  categories. Each page is `docs/<category>/<slug>.md`.
- **The slug is the filename, and it is GLOBALLY UNIQUE.** The category is only
  navigation decoration — it is **not** in the URL. The path on the site is built
  from the slug alone (`1gr14.dev/point0/latest/<slug>`). That's why the example
  pages are `example-basic`, `example-vite`, … (the bare `basic`/`vite` would have
  been fine too, but the `example-` prefix keeps them unmistakable and reserves the
  short names). When you add a page, the slug must not collide with any existing one.
- **`docs/categories.json`** lists the categories in nav order: `intro`, `points`,
  `methods`, `core`, `engine`, `extra`, `examples`. Register a new category here the
  first time it gets a page.
- **Frontmatter** (every page): `index` (sort order within the category), `title`
  (this is the H1 — do NOT repeat it as a heading in the body), `description` (one
  phrase). Example pages also carry `label` and `example: examples/<dir>`.
- **Site sync.** The site renders these pages at `1gr14.dev/point0/latest/<slug>`.
  Library READMEs use `<!-- docs:start -->`/`<!-- docs:end -->` markers to sync a
  single-page Overview; Point0 syncs the whole `docs/` folder instead.

### The pages (slug — category)

- **intro:** `overview` (the announcement article, translated), `getting-started`,
  `why` *(deleted — couldn't honestly say why-better-than-X yet; don't re-add
  without a real angle)*, `points`.
- **points:** `page`, `layout`, `component`, `provider`, `mountable`, `query`,
  `infinite-query`, `mutation`, `action`, `root`, `base`, `plugin`.
- **methods:** `validation`, `loader`, `ctx`, `middleware`, `loading-error`, `with`,
  `mapper`, `transformer`, `stage-methods` *(the hub for all builder methods; was
  `other-methods`)*.
- **core:** `navigation`, `ssr`, `request`, `response`, `error-handling`, `env`,
  `head`, `mdx`, `assets`, `file-upload`, `openapi`, `query-client`, `events`,
  `infer`.
- **engine:** `engine-config`, `engine-runtime`, `cli`, `dev`, `build`, `compiler`,
  `generator`, `mcp-project`, `mcp-docs`, `importer`, `publicdir`, `testing`,
  `deploy`, `bun-vs-vite`.
- **extra:** `ssr-store`, `cookie-store`, `basic-auth`, `cors`.
- **examples:** `example-basic` (canonical), `example-vite`, `example-better-auth`,
  `example-capacitor`, `example-expo`.

## How to write a page

Follow the **1gr14-docs** and **1gr14-voice** guides (in the agents repo). The short
version:

- **Examples with a thread of prose, not prose with examples.** Lead with a snippet,
  one sentence after. Push explanation into code comments. Show output where it
  matters (`// => …`, `// throws …`).
- **Top of the page:** what it is + why (2–3 sentences) + a hero example (real, a bit
  more than hello-world). Then narrate **by need** — a feature appears where the
  reader reaches for it. Full option tables / reference go at the **bottom**.
- **Voice:** clear simple English for non-native readers, present tense, active voice,
  no hype without a number or example. Use the short `.lets` notation in examples.
- **Source of truth, in priority order:** the overview article
  (`~/cc/agents/files/point0-intro.md`) for voice + canonical snippets → the **code**
  (`packages/*/src`) → **tests** (`packages/*/tests`) → **examples/** → **start0**
  (`~/cc/projects/start0/src`). **Code wins over prose.** What you can't confirm in
  code/tests, you do NOT invent — leave a TODO (below).

## Cross-cutting rules (apply on every page)

These are corrections that bit us; keep them.

1. **SSR is real.** Point0 server-renders the first load when SSR is on; it's
   SPA-like **only** for client-side navigation after that. Never write anything that
   implies there's no SSR. Don't drop bare "the client is an SPA" blocks.
2. **Error class.** Default is `ErrorPoint0`; you MAY use any class of the same-or-
   wider structure via `.errorClass(...)`. `error0` (`Error0.mark(...)`) is one
   optional way to build one — not required. Only the `error-handling` page leans on
   error0; elsewhere prefer `ErrorPoint0` / a neutral `AppError` ("your own class").
3. **Components are PascalCase** (`const UserCard = …`) — only `<UserCard />` works in
   JSX; a lowercase name forces `<userCard.X />`.
4. **Short `.lets` notation** in examples. The "needs the compiler / name from the
   variable" caveat is explained once on `points` — don't repeat it everywhere.
5. **TODOs are invisible, prioritized HTML comments** — see below.
6. **Our libs link to 1gr14.dev** (`route0`→`/route0`, `error0`→`/error0`,
   `flat`→`/flat`, `start0`→`/start0`), not GitHub. Cross-links between doc pages are
   bare slugs (`[mutations](mutation)`).
7. **No `logger.log`** (not a Point0 thing) — use `console.log`/`console.error`.
8. **A point id is `<scope>:<type>:<name>`** (e.g. `root:page:home`); use `point.id`,
   not `.toString()`. Endpoint paths use the **kebab-cased** name; queries/mutations
   are **POST with a body** (never GET with search params).
9. **Don't expose internals** (commented-out code, "not reachable through the typed
   overloads" trivia). Explain restrictions by intent.
10. **Point0 is deploy-agnostic.** Railway/`numReplicas`/start0 env-layering are NOT
    framework features — label them as examples.
11. **Config snippets show the full `export const engine = Engine.create({ … })`**
    wrapper with the option in its real nesting (`server:` / `client:`).
12. **Terminology:** *points* is the umbrella term; methods before the closing call
    are **stage-methods**, after are **ready-methods** (code types `StagePoint` /
    `ReadyPoint`); the page/layout/component/provider family are **mountables** (never
    "renderable"); a mountable with a loader is **also a query**.

## The four stripping categories (the big one)

Point0 ships most points to **two** bundles (server + client); the compiler decides,
per method, what is cut from which. **Verified against the compiler at
`packages/compiler/src/point.ts:1014-1170`** — the single place that defines it
(`shakeMethodsForClient` / `shakeMethodsForServer` / `shakeMethodsForAnotherScope`,
dispatched by `shakeMethods({ side, scope })`; the SSR gate is precomputed in
`getChainMethods()` ~`point.ts:899-929`).

**Lead every strip note with what is CUT and from which bundle — and that the
imports that code pulls in are pruned with it.** Where it *runs* is secondary.
Stripping empties the call's arguments (the chained call stays so types resolve) and
prunes the now-dead imports, so the dependency never lands in that bundle.

- **server-only** — cut from the **client** bundle. `.ctx`, the server `.loader`,
  `.input`, `.body`, `.headers`, `.cookies`, `.middleware`, `.serverOn`, `.response`,
  `.openapi`, `.description`, the `.action` server fn. `.params`/`.search` are
  server-only **only on an action** (isomorphic on a non-action mountable).
- **client-only** — cut from the **server** bundle, regardless of SSR.
  `.clientLoader`, `.clientInput`, `.clientOn`, `.scrollRestore`, `.scrollPosition`,
  `.onPrefetchPage`, `.prefetchPageOnNavigate`, `.prefetchPageOnLinkHover`.
- **server-and-client** — not cut from either bundle (isomorphic). Closers
  `.root`/`.base`/`.plugin`/`.query`/`.infiniteQuery`/`.mutation`; `.queryOptions` +
  the `*QueryOptions` family + `.mutationOptions` + `.fetchOptions` +
  `.prefetchPagePolicy`; `.transformer`/`.errorClass`/`.serverUrl`/`.clientUrl`/
  `.schemaHelper`/`.tag`/`.on`/`.use`; `.relatedQuery`; and `.input`/`.params`/
  `.search` on a non-action mountable.
- **server-ssr-and-client** — cut from the **server** bundle when `ssr:false` (or
  after a `.clientOnly()` earlier in the chain — it makes the rest behave as
  `ssr:false`); kept in the server build only under SSR, in the client build always.
  `.page`/`.layout`/`.component`/`.provider`; `.loading` (+ `.pageLoading`/…);
  `.error` (+ `.pageError`/…); `.wrapper`; `.with`; `.mapper`; `.head`.

`.clientOnly()` is the switch: it sets the rest of the chain to behave as `ssr:false`.

**Carry these notes where the method is documented:**

- **`.models`** — server-only by intent, but the compiler does NOT strip it yet
  (it's shipped to the client). HIGH TODO to add it to the client-strip list.
- **`.onPrefetchPage`** — intended to run on the client AND during server prefetch,
  but the compiler currently strips it from the server (client-only today). HIGH
  TODO. *(Sergei: confirm this is a compiler bug.)*
- **`.relatedQuery`** — DOES add its query to the `queries` array (same as a
  `.with(query)` result). The difference is **prefetch**: a related query is
  statically discoverable, so it self-fetches WITHOUT rendering under the cheap
  policies (`serverQuery`/`clientQuery`/`serverAndClientQuery`); a `.with(query)` is
  only discovered by rendering → prefetched only under `pageDehydratedState*` (the
  expensive, SSR-only full render). Don't say relatedQuery skips `queries`/`data`.
- **Self-query finiteness** — a mountable's self-query is **finite by default**, but
  ANY mountable can make it **infinite** by closing with `.infiniteQuery({...})`
  after its loader. Never write "always finite".

## JSDoc

The public API carries short JSDoc that mirrors the doc page (the page is the long
version; JSDoc is the short one). Conventions:

- House style: plain prose, an indented code example (per overload — show one short
  example for **each** call form, not just one), no `@tags`. End with
  `Full reference: https://1gr14.dev/point0/latest/<slug>` (a clickable site URL — it
  hovers in the editor for the end dev; do NOT use repo-relative `docs/…` paths).
- **State the strip category** (one of the four above) on each method, same wording
  as the page.
- **Comment-only.** Adding JSDoc must never change code/types. Verify after a JSDoc
  pass: every added line is a comment, and `/**` count == `*/` count (no unclosed
  block that could swallow code). It transpiles even in an un-bootstrapped worktree
  (`bun build`), since comments don't affect types.

## Adjacent artifacts

- **`docs/intro/overview.md`** is a faithful English translation of the announcement
  article `~/cc/agents/files/point0-intro.md` (intro + body + Production + Plans;
  Справка/P.S. dropped; doc links relativized to bare slugs). Edit the **article**
  first, then re-sync the translation.
- **`~/cc/agents/files/point0-intro.en.md`** is the dev.to English version of the
  same article (one-to-one, absolute links, VK Video + Telegram removed, everyone
  funneled to Discord). It reuses the overview translation.
- **Root `README.md`** = the overview text (links made absolute) wrapped in the
  canonical 1gr14 header (card image + tagline + badges) and footer.
- **Package `README.md`s** are super-minimal (title + one-liner + link to
  `1gr14.dev/point0` + sign-off). **They are the npm page** for each `@point0/*`
  package, so keep them clean.

## TODO convention

Gaps where the code/tests didn't confirm depth are marked as **invisible, prioritized
HTML comments** so they don't render on the site:

```
<!-- TODO(high): a wrong/missing API a reader needs -->
<!-- TODO(med): worth filling in -->
<!-- TODO(low): nice-to-have -->
```

All of them are collected, sorted by priority, in
**`dev/backlog/docs-todo.md`** — pick up there. Regenerate that file after page edits:

```sh
# from the worktree root
perl -0777 -ne 'while(/<!--\s*TODO\((high|med|low)\):\s*(.*?)\s*-->/gs){my($p,$t)=($1,$2);my $ln=1+(substr($_,0,pos())=~tr/\n//);$t=~s/\s+/ /g;print "$p\t$ARGV:$ln\t$t\n";}' \
  $(grep -rl '<!-- TODO(' docs packages --include='*.md' --include='*.ts' --include='*.tsx') \
  | sort
```

## How this pass was built (for whoever continues)

- **Accuracy gate is mandatory.** A writer agent confidently fabricates plausible-but-
  fake classes/methods (we caught an invented `ForbiddenError`, a fake `point0 start`,
  a non-existent `Infer.Location`). Every page was produced by a **mine → write →
  verify → fix** pipeline: a miner extracts a cited inventory from code/tests; a writer
  drafts to the bar; an **adversarial verifier** re-checks every claim/snippet against
  the code and returns discrepancies; a fixer applies them. Don't skip the verify.
- Cross-page consistency was a separate **theme-auditor** pass (one agent per concern —
  SSR/SPA, error-class, terminology, cross-links, strip notes, …) across all pages.
- Mechanical sweeps catch the rest: broken cross-links (every `](slug)` must be a real
  page filename), leftover Cyrillic in English files (`rg '\p{Cyrillic}'`), `logger.log`,
  "always finite", bare "client is an SPA", etc.

## Pointers

- Announcement article (source of voice + overview): `~/cc/agents/files/point0-intro.md`
  (RU), `…/point0-intro.en.md` (EN dev.to).
- Compiler strip map: `packages/compiler/src/point.ts:1014-1170`.
- The 11k-line builder: `packages/core/src/point0.ts` — grep, never read whole.
- Writing guides: **1gr14-docs** (structure) + **1gr14-voice** (tone) in the agents repo.

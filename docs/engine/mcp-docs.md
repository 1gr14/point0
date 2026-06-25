---
index: 900
title: Docs MCP
description:
  point0-docs-mcp — a local MCP server that searches the Point0 docs, so an
  agent answers from the real docs instead of guessing.
---

`point0-docs-mcp` is an MCP server that gives an agent the Point0 documentation:
it exposes three read-only tools — list, search, get — over a prebuilt docs
corpus with local hybrid search (keyword + semantic). The point is that the
agent answers framework questions from the real, current docs, not from what it
made up. It ships in the `@point0/docs` package and runs over stdio.

```json
// .mcp.json (Claude Code) — also .cursor/mcp.json (Cursor), identical content
{
  "mcpServers": {
    "point0-docs": { "command": "bun", "args": ["run", "mcp:docs"] }
  }
}
```

```jsonc
// package.json — the script the config calls
"scripts": {
  "mcp:docs": "point0-docs-mcp"
}
```

That's the whole setup. `create-point0-app` writes both files for you, so a
fresh app already has the docs MCP wired. The rest of this page is what the
three tools do and how the corpus is built.

## What `create-point0-app` ships

The scaffold wires the docs MCP for both Claude Code and Cursor, alongside the
[project MCP](mcp-project):

```json
// .mcp.json AND .cursor/mcp.json — same file, two locations
{
  "mcpServers": {
    "point0-project": { "command": "bun", "args": ["run", "mcp:project"] },
    "point0-docs": { "command": "bun", "args": ["run", "mcp:docs"] }
  }
}
```

```jsonc
// package.json scripts
"mcp:project": "point0-project-mcp --meta ./src/generated/point0/meta.ts",
"mcp:docs": "point0-docs-mcp"
```

The config calls the npm **script** (`bun run mcp:docs`), not the bin directly,
so the bin name lives in one place. `@point0/docs` is a **devDependency** — it
pulls in a local embedding stack (`@huggingface/transformers`) and a prebuilt
vector index, runtime-only tooling you don't want in production deps.

The docs MCP takes **no arguments**. (The `--meta` flag belongs to the
[project MCP](mcp-project), which reads your app's generated meta — a different
server. Don't pass it here.)

## The three tools

Every tool is read-only and returns JSON. An agent typically searches, then gets
the full page.

### `search_docs` — find a section

```jsonc
search_docs({ query: "how do I gate a page behind auth" })
// => {
//   "hits": [
//     { "slug": "with", "title": ".with", "category": "methods",
//       "heading": "Security: gate access in .with, not .ctx",
//       "snippet": ".with runs at render, including on the client…",
//       "score": 0.71 },
//     …
//   ],
//   "total": 12, "hasMore": true, "nextOffset": 8
// }
```

Hybrid search: BM25 keyword matching plus a 384-dim vector similarity, combined
in one query. `query` is required and natural-language; `limit` defaults to
**8** and `offset` to **0**.

Hits are **sections, not whole pages** — `heading` is the matched h2/h3, `slug`
points to the parent page. The `snippet` is the section's first ~280 characters,
whitespace-collapsed, with an ellipsis when truncated. After a search, call
`get_doc(slug)` for the full page.

### `get_doc` — read a full page

```jsonc
get_doc({ slug: "overview" })
// => { "slug": "overview", "category": "intro", "title": "Overview",
//      "description": "…", "index": 100,
//      "content": "# full markdown body…" }
```

`slug` is the **bare file name** — `"overview"`, never `"intro/overview"`. The
category is cosmetic and not part of the slug. `content` is the full markdown
with frontmatter stripped.

The JSON object shown above is the tool's `structuredContent`; `get_doc`'s
plain-text channel (`content[0].text`) is just the raw markdown body, not the
JSON. (`search_docs` and `list_docs` put `JSON.stringify(result)` in their text
channel.)

An unknown slug is a clean error result the agent can read, not a thrown
exception:

```jsonc
get_doc({ slug: "nope" })
// => { content: [{ type: "text", text: 'No doc found for slug "nope".' }], isError: true }
```

### `list_docs` — the table of contents

```jsonc
list_docs()
// => {
//   "docs": [
//     { "slug": "overview", "category": "intro", "title": "Overview", "description": "…" },
//     …
//   ],
//   "total": N, "hasMore": false
//   // nextOffset is undefined here, so JSON.stringify drops the key entirely
// }
```

Lists every page by `slug`, `category`, `title`, and `description`, ordered by
category (the order in `categories.json`) then by each page's frontmatter
`index`. Both `limit` and `offset` are optional — **omit `limit` and you get all
pages from `offset`** (and `hasMore` is `false`). The list is small, so you
rarely paginate it.

## Where the corpus comes from

The search corpus is **prebuilt at package-build time and shipped inside the npm
package** — search is offline and needs no API key at query time.

```sh
# packages/docs build step, run before tsdown
bun run build:content
# [point0/docs] built N docs, M sections → content/docs.json
```

`build:content` reads the repo's `docs/` directory, splits each page into
sections at its h2/h3 headings, embeds every section locally, and writes one
`content/docs.json`. That file is gitignored but published (it's in the
package's `files`), so installing `@point0/docs` gives you the whole prebuilt
index.

The embedding model is **`Xenova/all-MiniLM-L6-v2`** (384-dim, ~23MB, via
`@huggingface/transformers`). At query time the server only embeds _your search
query_ — the document vectors are already computed — so it loads no model for
`list_docs` or `get_doc`.

```text
# the model downloads once into the shared Hugging Face cache, reused across projects
~/.cache/huggingface
```

The **first** `search_docs` call triggers the one-time ~23MB model download and
builds the in-memory index, so it's slow; everything after is local and fast.
`list_docs` and `get_doc` never touch the model, so they're instant even on a
cold start.

## A note on freshness

The corpus is a **snapshot** taken when `@point0/docs` was built. Search
reflects the docs as of that package version — it is **not** live against your
local edits or a newer docs site. To pick up newer docs, update the
`@point0/docs` dependency. (Contrast the [project MCP](mcp-project), which
re-reads your app's meta on every call.)

## llms.txt — the zero-setup alternative

If you don't want to run an MCP server at all, the Point0 site serves the same
docs as plain text following the [llmstxt.org](https://llmstxt.org) standard:

```text
https://1gr14.dev/llms.txt       # an index: one link per doc, agent fetches what it needs
https://1gr14.dev/llms-full.txt  # the entire docs corpus in one file, for a single fetch
```

Feed either URL to an agent and it can answer framework questions with no
install step. The two paths are complementary: `point0-docs-mcp` is the local,
searchable path (three tools, offline after the model downloads); `llms.txt` is
the fetch-based path (zero setup, no local model). `@point0/docs` builds its
corpus from `docs/` at package-build time; the `llms.txt` files are built and
served by the Point0 site. Both draw on the same `docs/` source.

## Reference

### Tools

| Tool          | Input                                                         | Returns                                                                  |
| ------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `search_docs` | `query` (required), `limit` (default 8), `offset` (default 0) | `{ hits, total, hasMore, nextOffset }` — hits are sections               |
| `get_doc`     | `slug` (required; bare file name)                             | the full `Doc` (`content` = full markdown), or `isError` if unknown      |
| `list_docs`   | `limit` (optional → all), `offset` (default 0)                | `{ docs, total, hasMore, nextOffset }` — slug/category/title/description |

### A search hit

```ts
{
  ;(slug, title, category, heading, snippet, score)
}
```

`slug` is the parent page; `heading` is the matched section. Pass `slug` to
`get_doc` for the full page. `score` is Orama's raw hybrid score — higher is a
better match; rank by it, don't read a fixed range into it.

### Server facts

- **Transport:** stdio only — no HTTP/SSE.
- **Server name:** `point0-docs`. Its reported `version` is a hardcoded `1.0.0`
  and does **not** track the `@point0/docs` package version.
- **Capabilities:** tools only — no MCP resources or prompts.
- **Categories:** `intro`, `points`, `methods`, `core`, `engine`, `extra`,
  `examples` (from `docs/categories.json`) — grouping only, never part of a
  slug.
- **Slugs are bare file names, not deduped across categories.** The category is
  not folded into the slug, so file names must be unique across the whole docs
  tree.
- **A missing or corrupt corpus is a hard error.** `content/docs.json` is read
  and `JSON.parse`d with no fallback, so a build that skipped `build:content`
  (or a truncated file) makes the first tool call throw.

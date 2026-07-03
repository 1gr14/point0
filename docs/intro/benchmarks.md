---
index: 400
title: Benchmarks
description:
  How Point0 measures against Next.js and TanStack Start on the same app —
  build, HMR, type-check at scale, client payloads, SSR. Every number comes from
  an open, reproducible benchmark repo.
---

Every number on this page comes from the open benchmark repo:
**[github.com/1gr14/point0-benchmarks](https://github.com/1gr14/point0-benchmarks)**.
The setup: the same app — a small blog plus a SaaS-style dashboard — built three
times (Point0, Next.js, TanStack Start), each in its framework's native idiom,
rendering the same content from the same deterministic in-memory store. A
17-assertion Playwright parity gate must be green before any number counts;
results are medians over repeated runs; raw per-run JSON is committed. This page
is the short read — the repo README carries the full method and all tables.

Measured on an Apple M1 Pro (July 2026): Point0 0.1.7, Next.js 16.2.10, TanStack
Start 1.168.27, React 19.2.7 everywhere. Each framework runs on its own
supported runtime — Point0 on Bun 1.3.14, Next and TanStack on Node 22.21.1 —
and every load number sits next to a bare `Bun.serve` / `node:http` floor, so
runtime and framework tax stay separable.

## Summary

|                                      | Point0           | Next.js          | TanStack Start   |
| ------------------------------------ | ---------------- | ---------------- | ---------------- |
| Runtime (as shipped)                 | Bun              | Node             | Node             |
| Prod build, S ↓                      | 3.35 s           | 4.49 s           | 4.96 s           |
| Prod build, L (+500 pages) ↓         | 9.59 s           | 19.82 s          | 22.10 s          |
| HMR, edit → DOM ↓                    | 15 ms            | 45 ms            | 164 ms           |
| Dev start, cold / warm ↓             | 2,715 / 1,433 ms | 2,530 / 2,234 ms | 2,326 / 2,215 ms |
| Editor re-check, L ↓                 | 1.59 s           | 3.94 s           | 1.58 s           |
| Cold type-check (CI), L · TS7 ↓      | 6.13 s           | 0.64 s           | 1.38 s           |
| First-load JS, /post (gzip) ↓        | 133.4 kB         | 147.7 kB         | 103.8 kB         |
| Nav payload, dashboard → dashboard ↓ | 474 B            | 1,355 B          | 275 B            |
| SSR /post, req/s c64 ↑ \*            | 1,099            | 521              | 2,921            |
| Prod cold start ↓                    | 305 ms           | 765 ms           | 103 ms           |

↓ lower is better · ↑ higher is better. \* Point0's SSR row is its **warmed**
build (`.onPrefetchPage`, 0 re-renders) — the peer of Next/TanStack's eager
loaders; the default lazy build does 944 req/s.

## Where Point0 wins: the edit loop

- **Production build** is the fastest at every size, and the lead widens with
  the app: at 500 pages Point0 builds in 9.6 s versus Next's 19.8 s and
  TanStack's 22.1 s — over 2× on both.
- **HMR** lands in ~15 ms — within one frame — against Next's 45 ms and
  TanStack's 164 ms.
- **Dev start** is the fastest where it matters: 1.4 s warm. The cold row (2.7
  s, a few hundred ms behind the others) is the first run of a project ever —
  the compiler's first pass fills a persistent disk cache and pays once per
  project.

## Types at scale: two different questions

Cold whole-project `tsc` and editor responsiveness are different metrics, and
conflating them is the usual mistake.

**The cold check is Point0's slow axis.** Inferring everything end-to-end with
zero annotations costs ~2,300 type instantiations per page: at 500 pages that's
6.1 s on native TS7 (17.3 s on the JS tsc) versus Next's 0.6 s and TanStack's
1.4 s. You pay that in CI.

**The per-edit re-check — the lag you feel while typing — stays flat.** Point0
pages are isolated exports: there is no monolithic `AppRouter` type to
re-instantiate on each keystroke (the tRPC trap), and the generated route map is
just path strings.

| Per-edit re-check | Point0 | Next.js | TanStack Start |
| ----------------- | ------ | ------- | -------------- |
| 4 pages           | 1.50 s | 1.62 s  | 1.44 s         |
| 504 pages         | 1.59 s | 3.94 s  | 1.58 s         |

Point0 and TanStack hold flat; Next degrades to ~3.9 s per edit at 500 pages —
2.5× Point0.

## Navigation ships data, never HTML

After the first document, a Point0 navigation ships only query data. On a
post→post click that's ~0.86 kB against Next's ~1.27 kB RSC payload (TanStack:
~0.63 kB). The dashboard case — rich markup, tiny data, the shape of a real SaaS
page — makes the split sharp: Point0 moves 474 B per click and TanStack 275 B,
while Next re-sends the rendered markup as its flight payload — 1,355 B, roughly
3× Point0. First-load JS: TanStack 104 kB, Point0 133 kB, Next 148 kB (gzip).

## Raw SSR: the price of not declaring data deps

On raw SSR throughput with in-memory data, TanStack leads (2,921 req/s), Point0
is second (1,099 warmed), Next is behind (521). Point0's default is a
render-to-discover loop: it renders, sees which queries the page needs, fetches,
re-renders — so you never declare a page's data dependencies, which neither Next
nor TanStack offers. That convenience costs ~14% (944 req/s); one opt-in hook
(`.onPrefetchPage(() => q.fetchQuery(...))`) removes it.

Point0's SSR document carries data twice — markup plus the dehydrated React
Query cache that makes every piece of data a live, cacheable query on the
client. On a text-heavy post that's 5.4 kB raw vs TanStack's 3.8 kB — and gzip
nearly erases it: 1.8 kB vs 1.7 kB (+6%). Next's document is the largest of the
three (9.2 kB raw, 2.4 kB gzipped): RSC inlines its flight payload, duplicating
the same data in a less compressible format.

Prod cold start is 305 ms — behind TanStack's 103 ms, 2.5× ahead of Next's 765
ms. Part of that 305 ms is deliberate: Point0 imports the whole app at boot, so
a broken page fails the process at deploy time, not on a user's first request.

## The DB reality check

The raw-SSR numbers above measure frameworks in a vacuum — the loader is
trivial, so framework CPU is the whole latency. Add one realistic DB query and
the gap collapses:

| DB delay | Point0   | Next.js  | TanStack Start |
| -------- | -------- | -------- | -------------- |
| 0 ms     | 1.26 ms  | 2.35 ms  | 0.37 ms        |
| 20 ms    | 26.38 ms | 24.63 ms | 23.28 ms       |

At 20 ms of DB latency all three land within 23–26 ms; the framework becomes a
14–24% slice that keeps shrinking as queries get heavier. That's why Point0
spends its budget on what a database can't erase: build, HMR, per-edit
type-check, and navigation payloads.

## Reproduce

```sh
git clone https://github.com/1gr14/point0-benchmarks
cd point0-benchmarks
bun run setup   # installs all three apps + Playwright
bun run parity  # the gate — 17/17 must pass
bun run bench:all
bun run render  # regenerates the README from results/
```

Numbers are machine-dependent (except type instantiations and byte sizes, which
are deterministic); the repo's manifest records the exact machine and versions
behind every published table. If you find a setup that treats any framework
unfairly — [open an issue](https://github.com/1gr14/point0-benchmarks/issues).

---
index: 400
title: Benchmarks
description:
  How Point0 measures against Next.js, TanStack Start and React Router on the
  same app — build, HMR, type-check at scale, client payloads, streaming, SSR.
  Every number comes from an open, reproducible benchmark repo.
---

Every number on this page comes from the open benchmark repo:
**[github.com/1gr14/point0-benchmarks](https://github.com/1gr14/point0-benchmarks)**.
The setup: the same app — a small blog plus a SaaS-style dashboard — built four
times (Point0, Next.js, TanStack Start, React Router), each in its framework's
native idiom, rendering the same content from the same deterministic in-memory
store. A Playwright parity gate (22 assertions per app) must be green before any
number counts; results are medians over repeated runs; raw per-run JSON is
committed. This page is the short read — the repo README carries the full method
and all tables.

Measured on an Apple M1 Pro (August 2026): Point0 0.3.10, Next.js 16.3.0,
TanStack Start 1.168.27, React Router 8.3.0, React 19.2.7 everywhere. Each
framework runs on its own supported runtime — Point0 on Bun 1.3.14, the others
on Node 22.21.1 — and every load number sits next to a bare `Bun.serve` /
`node:http` floor, so runtime and framework tax stay separable.

In the tables, every competitor cell carries a small delta vs Point0:
<sub class="bench-good">green</sub> means that framework is better on the
metric, <sub class="bench-bad">red</sub> means worse. Point0's own cells stay
bare.

## Summary

|                                      | Point0   | Next.js                                    | TanStack Start                             | React Router                              |
| ------------------------------------ | -------- | ------------------------------------------ | ------------------------------------------ | ----------------------------------------- |
| Runtime (as shipped)                 | Bun      | Node                                       | Node                                       | Node                                      |
| Prod build, L (+500 pages) ↓         | 10.26 s  | 11.85 s <sub class="bench-bad">+15%</sub>  | 18.82 s <sub class="bench-bad">+83%</sub>  | 4.53 s <sub class="bench-good">−56%</sub> |
| HMR, edit → DOM ↓                    | 14 ms    | 42 ms <sub class="bench-bad">3.0×</sub>    | 161 ms <sub class="bench-bad">11.5×</sub>  | 152 ms <sub class="bench-bad">10.9×</sub> |
| Dev start, warm ↓                    | 1,281 ms | 1,991 ms <sub class="bench-bad">+55%</sub> | 2,027 ms <sub class="bench-bad">+58%</sub> | 1,296 ms <sub class="bench-bad">+1%</sub> |
| Editor re-check, L ↓                 | 1.47 s   | 1.26 s <sub class="bench-good">−14%</sub>  | 1.50 s <sub class="bench-bad">+2%</sub>    | 1.42 s <sub class="bench-good">−3%</sub>  |
| Cold type-check (CI), L · TS7 ↓      | 6.74 s   | 0.24 s <sub class="bench-good">−96%</sub>  | 0.60 s <sub class="bench-good">−91%</sub>  | 1.13 s <sub class="bench-good">−83%</sub> |
| First-load JS, /post (gzip) ↓        | 152 kB   | 135 kB <sub class="bench-good">−11%</sub>  | 104 kB <sub class="bench-good">−32%</sub>  | 103 kB <sub class="bench-good">−32%</sub> |
| Nav payload, dashboard → dashboard ↓ | 473 B    | 1,342 B <sub class="bench-bad">+184%</sub> | 275 B <sub class="bench-good">−42%</sub>   | 552 B <sub class="bench-bad">+17%</sub>   |
| Time-to-shell, /slow (streamed) ↓    | 7 ms     | 8 ms <sub class="bench-bad">+14%</sub>     | 3 ms <sub class="bench-good">−57%</sub>    | 4 ms <sub class="bench-good">−43%</sub>   |
| SSR /post, req/s c64 ↑ \*            | 1,166    | 834 <sub class="bench-bad">−28%</sub>      | 3,388 <sub class="bench-good">+191%</sub>  | 1,239 <sub class="bench-good">+6%</sub>   |
| Prod cold start ↓                    | 463 ms   | 759 ms <sub class="bench-bad">+64%</sub>   | 99 ms <sub class="bench-good">−79%</sub>   | 629 ms <sub class="bench-bad">+36%</sub>  |

↓ lower is better · ↑ higher is better. \* Point0's SSR row is its **warmed**
build (`.onPrefetchPage`, 0 re-renders) — the peer of the others' eager loaders;
the default lazy build does 888 req/s.

## Where Point0 wins: the loop you live in

- **HMR lands in ~14 ms** — within one frame — against Next's 42 ms and
  TanStack's and React Router's ~150 ms. This is the number you feel hundreds of
  times a day.
- **Warm dev start** is the fastest at 1.28 s (React Router is right behind at
  1.30 s; Next and TanStack take ~2 s). The cold row — 3.1 s, the slowest — is
  the first run of a project ever: the compiler's first pass fills a persistent
  disk cache and pays once per project.
- **Production build at scale** is second: 10.3 s for 500 pages, ahead of Next's
  11.9 s and TanStack's 18.8 s (at the base size Point0 is mid-pack: 5.1 s vs
  TanStack's 4.4 s). React Router's lean Vite pipeline is the build-speed leader
  at every size — 4.5 s for 500 pages, credit where due.

## Types at scale: two different questions

Cold whole-project `tsc` and editor responsiveness are different metrics, and
conflating them is the usual mistake.

**The cold check is Point0's slow axis.** Inferring everything end-to-end with
zero annotations costs ~4,300 type instantiations per page: at 500 pages that's
2.23M instantiations — 6.7 s on native TS7, 17.4 s on the JS tsc — versus Next's
0.24 s and TanStack's 0.6 s. You pay that in CI.

**The per-edit re-check — the lag you feel while typing — stays flat.** Point0
pages are isolated exports: no monolithic `AppRouter` type to re-instantiate on
each keystroke (the tRPC trap), and the generated route map is just path
strings.

| Per-edit re-check | Point0 | Next.js                                   | TanStack Start                           | React Router                              |
| ----------------- | ------ | ----------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| 4 pages           | 1.38 s | 1.03 s <sub class="bench-good">−25%</sub> | 1.34 s <sub class="bench-good">−3%</sub> | 1.05 s <sub class="bench-good">−24%</sub> |
| 504 pages         | 1.47 s | 1.26 s <sub class="bench-good">−14%</sub> | 1.50 s <sub class="bench-bad">+2%</sub>  | 1.42 s <sub class="bench-good">−3%</sub>  |

Everyone holds flat here now (Next fixed its old per-edit degradation in 16.x);
Point0 sits at the top of the band — ~0.2 s behind Next, in the same lane as
TanStack — not multiples behind anyone. The outlier at scale is React Router's
_cold_ check: its typed routes explode combinatorially — 10k instantiations at 4
pages, 4.35M at 504, double Point0's count.

## Navigation ships data, never HTML

After the first document, a Point0 navigation ships only query data. On a
post→post click that's ~0.84 kB against Next's ~1.2 kB RSC payload (TanStack:
~0.63 kB, React Router: ~0.94 kB). The dashboard case — rich markup, tiny data,
the shape of a real SaaS page — makes the split sharp: Point0 moves 473 B per
click and TanStack 275 B, while Next re-sends the rendered markup as its flight
payload — 1,342 B, roughly 3× Point0.

The other side of the ledger: first-load JS. Point0 is currently the heaviest of
the four — 152 kB gzipped against Next's 135 kB and TanStack's and React
Router's ~103 kB — the bundle price of the RSC/streaming machinery added through
0.2–0.3. Point0 pays once on the first load and collects on every click after.

## Streaming: opt-in, and what it buys

Every framework here can stream a slow block into the same response after the
shell. On a page with one 1.5 s query, all four ship the shell in single-digit
milliseconds when streaming — Point0 in 7 ms via a `.loading()` fallback +
`.query({ suspend: 'server' })`. The contrast row is Point0 with streaming off:
the whole document waits for the slow block, and the shell arrives at ~1,510 ms.
That's what streaming buys back — and Point0 makes it a per-query opt-in instead
of an architecture decision.

## Raw SSR: the price of not declaring data deps

On raw SSR throughput with in-memory data, TanStack leads (3,388 req/s), React
Router and warmed Point0 are essentially tied (1,239 vs 1,166), Next is behind
(834). Point0's default is a render-to-discover loop: it renders, sees which
queries the page needs, fetches, re-renders — so you never declare a page's data
dependencies, which none of the other three offer. That convenience costs ~24%
(888 req/s); one opt-in hook (`.onPrefetchPage(() => q.fetchQuery(...))`)
removes it.

Point0's SSR document carries data twice — markup plus the dehydrated React
Query cache that makes every piece of data a live, cacheable query on the
client. On a text-heavy post that's 6.5 kB raw vs TanStack's 3.8 kB — and gzip
cuts the gap sharply: 2.2 kB vs 1.7 kB. Next's document is the largest of the
four (8.9 kB raw, 2.4 kB gzipped): RSC inlines its flight payload, duplicating
the same data in a less compressible format.

Prod cold start is 463 ms — behind TanStack's 99 ms, ahead of React Router's 629
ms and Next's 759 ms. Part of that is deliberate: Point0 imports the whole app
at boot, so a broken page fails the process at deploy time, not on a user's
first request.

## The DB reality check

The raw-SSR numbers above measure frameworks in a vacuum — the loader is
trivial, so framework CPU is the whole latency. Add one realistic DB query and
the gap collapses:

| DB delay | Point0   | Next.js                                    | TanStack Start                             | React Router                               |
| -------- | -------- | ------------------------------------------ | ------------------------------------------ | ------------------------------------------ |
| 0 ms     | 1.15 ms  | 1.76 ms <sub class="bench-bad">+53%</sub>  | 0.33 ms <sub class="bench-good">−71%</sub> | 1.01 ms <sub class="bench-good">−12%</sub> |
| 20 ms    | 27.14 ms | 25.48 ms <sub class="bench-good">−6%</sub> | 24.96 ms <sub class="bench-good">−8%</sub> | 26.07 ms <sub class="bench-good">−4%</sub> |

At 20 ms of DB latency all four land within 25–27 ms; the framework becomes a
20–26% slice that keeps shrinking as queries get heavier. That's why Point0
spends its budget on what a database can't erase: HMR, navigation payloads, and
the edit loop.

## Reproduce

```sh
git clone https://github.com/1gr14/point0-benchmarks
cd point0-benchmarks
bun run setup   # installs all four apps + Playwright
bun run parity  # the gate — 22/22 must pass per app
bun run bench:all
bun run render  # regenerates the README from results/
```

Numbers are machine-dependent (except type instantiations and byte sizes, which
are deterministic); the repo's manifest records the exact machine and versions
behind every published table. If you find a setup that treats any framework
unfairly — [open an issue](https://github.com/1gr14/point0-benchmarks/issues).

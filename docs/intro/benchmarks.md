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

Measured on an Apple M1 Pro: Point0 0.3.13, Next.js 16.3.2, TanStack Start
1.168.27, React Router 8.3.0, React 19.2.8 everywhere. Each framework runs on
its own supported runtime — Point0 on Bun 1.4.0, the others on Node 22.21.1 —
and every load number sits next to a bare `Bun.serve` / `node:http` floor, so
runtime and framework tax stay separable.

In the tables, every competitor cell carries a small delta vs Point0:
<sub class="bench-good">green</sub> means that framework is better on the
metric, <sub class="bench-bad">red</sub> means worse. Point0's own cells stay
bare.

## Summary

|                                      | Point0 | Next.js                                    | TanStack Start                              | React Router                               |
| ------------------------------------ | ------ | ------------------------------------------ | ------------------------------------------- | ------------------------------------------ |
| Runtime (as shipped)                 | Bun    | Node                                       | Node                                        | Node                                       |
| HMR, edit → DOM ↓                    | 20 ms  | 54 ms <sub class="bench-bad">2.7×</sub>    | 175 ms <sub class="bench-bad">8.8×</sub>    | 157 ms <sub class="bench-bad">7.9×</sub>   |
| Dev start, warm ↓                    | 972 ms | 1,924 ms <sub class="bench-bad">+98%</sub> | 2,015 ms <sub class="bench-bad">+107%</sub> | 1,263 ms <sub class="bench-bad">+30%</sub> |
| Prod build, L (+500 pages) ↓         | 7.49 s | 10.87 s <sub class="bench-bad">+45%</sub>  | 18.20 s <sub class="bench-bad">+143%</sub>  | 4.47 s <sub class="bench-good">−40%</sub>  |
| Editor re-check, L ↓                 | 1.06 s | 0.82 s <sub class="bench-good">−23%</sub>  | 1.07 s <sub class="bench-bad">+1%</sub>     | 0.96 s <sub class="bench-good">−9%</sub>   |
| Cold type-check (CI), L · TS7 ↓      | 6.85 s | 0.23 s <sub class="bench-good">−97%</sub>  | 0.58 s <sub class="bench-good">−92%</sub>   | 1.12 s <sub class="bench-good">−84%</sub>  |
| First-load JS, /post (gzip) ↓        | 150 kB | 136 kB <sub class="bench-good">−9%</sub>   | 104 kB <sub class="bench-good">−31%</sub>   | 103 kB <sub class="bench-good">−31%</sub>  |
| Nav data payload, dashboard (gzip) ↓ | 470 B  | 1,335 B <sub class="bench-bad">+184%</sub> | 274 B <sub class="bench-good">−42%</sub>    | 254 B <sub class="bench-good">−46%</sub>   |
| Time-to-shell, /slow (streamed) ↓    | 7 ms   | 10 ms <sub class="bench-bad">+43%</sub>    | 5 ms <sub class="bench-good">−29%</sub>     | 5 ms <sub class="bench-good">−29%</sub>    |
| SSR /post, req/s c64 ↑ \*            | 1,548  | 882 <sub class="bench-bad">−43%</sub>      | 3,284 <sub class="bench-good">+112%</sub>   | 1,156 <sub class="bench-bad">−25%</sub>    |
| Prod cold start ↓                    | 448 ms | 721 ms <sub class="bench-bad">+61%</sub>   | 100 ms <sub class="bench-good">−78%</sub>   | 612 ms <sub class="bench-bad">+37%</sub>   |
| RSS idle ↓                           | 348 MB | 363 MB <sub class="bench-bad">+4%</sub>    | 173 MB <sub class="bench-good">−50%</sub>   | 251 MB <sub class="bench-good">−28%</sub>  |

↓ lower is better · ↑ higher is better. \* Point0's SSR row is its **warmed**
build (`.onPrefetchPage`, 0 re-renders) — the peer of the others' eager loaders;
the default lazy build does 1,200 req/s.

## The edit loop

This is where Point0's advantage is concentrated, and it is the part of the
table you touch most often.

- **HMR lands in 20 ms** against Next's 54 ms and TanStack's and React Router's
  ~160 ms. This is the loop that runs on every save.
- **Warm dev start is 972 ms** — the only sub-second start of the four (React
  Router 1.26 s, Next 1.92 s, TanStack 2.02 s). Cold dev start is Point0's
  slowest row at 2.47 s: that is the first run of a project ever, when the
  compiler's first pass fills a persistent disk cache.
- **Production build at scale is second**: 7.49 s for 500 pages, ahead of Next's
  10.87 s and TanStack's 18.20 s. React Router's lean Vite pipeline is the
  build-speed leader at both sizes (1.64 s base, 4.47 s at 500 pages).

## Types at scale: two different questions

Cold whole-project `tsc` and editor responsiveness are different metrics, and
conflating them is the usual mistake.

**The cold check is Point0's clear cost.** Inferring everything end-to-end with
zero annotations runs to 2.23M type instantiations at 500 pages — 6.85 s on
native TS7, 17.45 s on the JS `tsc` — against Next's 0.23 s and TanStack's 0.58
s. You pay that in CI, and it is a real bill.

**The per-edit re-check — the lag you feel while typing — does not separate the
field.** Point0 pages are isolated exports: there is no monolithic `AppRouter`
type to re-instantiate on each keystroke, and the generated route map is just
path strings.

| Per-edit re-check | Point0 | Next.js                                   | TanStack Start                           | React Router                              |
| ----------------- | ------ | ----------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| 4 pages           | 0.94 s | 0.61 s <sub class="bench-good">−35%</sub> | 0.91 s <sub class="bench-good">−3%</sub> | 0.61 s <sub class="bench-good">−35%</sub> |
| 504 pages         | 1.06 s | 0.82 s <sub class="bench-good">−23%</sub> | 1.07 s <sub class="bench-bad">+1%</sub>  | 0.96 s <sub class="bench-good">−9%</sub>  |

All four stay flat from 4 pages to 504, and at any given size they sit within a
third of a second of each other. Point0 sits at the slow end of that band —
which is another way of saying this metric will not decide anything for you. The
structural outlier is React Router's _cold_ check: its typed routes grow
combinatorially, from 10k instantiations at 4 pages to 4.35M at 504 — the
largest count of the four — though native TS7 still clears it in 1.12 s.

## Navigation and payloads

After the first document, a Point0 navigation ships query data and never HTML.
So do TanStack Start and React Router, and on the dashboard case — rich markup,
tiny data, the shape of a real SaaS page — the three land close together: React
Router 254 B, TanStack 274 B, Point0 470 B gzipped. At that scale the gaps
between them do not matter. Next is the outlier at 1,335 B, because its RSC
flight payload re-sends the rendered markup; the fair caveat is that Next
prefetches every visible link, so those bytes move before the click rather than
during it.

Felt latency does not differentiate either: a dashboard→dashboard click resolves
in 30–33 ms on all four.

The other side of the ledger is first-load JS, and it is Point0's heaviest row:
150 kB gzipped against Next's 136 kB and TanStack's and React Router's ~103 kB.
Point0 pays that once on the first load and collects on every click after.

Memory is a cost too, and it does not wash out. Against a bare `Bun.serve` +
`renderToString` floor of 118 MB, Point0 idles at 348 MB — about 230 MB of
framework tax — while TanStack sits ~38 MB above its Node floor. Point0 is the
second-heaviest of the four at idle.

## Streaming: opt-in, and what it buys

Every framework here can stream a slow block into the same response after the
shell. On a page with one 1.5 s query, all four ship the shell in single-digit
milliseconds — Point0 in 7 ms via a `.loading()` fallback +
`.query({ suspend: 'server' })`, and the 5–10 ms spread across the four is noise
on a local server. The contrast row is Point0 with streaming off: the whole
document waits for the slow block and nothing appears until ~1,515 ms. That is
what streaming buys back, and Point0 makes it a per-query opt-in instead of an
architecture decision.

## Raw SSR: the price of not declaring data deps

On raw SSR throughput with in-memory data, TanStack leads at 3,284 req/s — a
real and large lead — followed by warmed Point0 at 1,548, default Point0 at
1,200, React Router at 1,156 and Next at 882.

Point0's default is a render-to-discover loop: it renders, sees which queries
the page needs, fetches them, re-renders — so you never declare a page's data
dependencies, which none of the other three offer. That convenience costs ~22%
(1,200 vs 1,548 req/s); one opt-in hook
(`.onPrefetchPage(() => q.fetchQuery(...))`) removes it.

Point0's SSR document carries data twice — markup plus the dehydrated React
Query cache that makes every piece of data a live, cacheable query on the
client. On a text-heavy post that is 6.5 kB raw vs TanStack's 3.8 kB, and gzip
closes most of the gap: 2.19 kB vs 1.68 kB. Next's document is the largest of
the four (8.9 kB raw, 2.44 kB gzipped), since RSC inlines its flight payload in
a less compressible format.

Prod cold start is 448 ms — behind TanStack's 100 ms, ahead of React Router's
612 ms and Next's 721 ms. Part of that is deliberate: Point0 imports the whole
app at boot, so a broken page fails the process at deploy time, not on a user's
first request.

## The DB reality check

The SSR numbers above measure frameworks in a vacuum — the loader is trivial, so
framework CPU is the whole latency. Add one realistic DB query and the
differences stop existing:

| DB delay | Point0   | Next.js  | TanStack Start | React Router |
| -------- | -------- | -------- | -------------- | ------------ |
| 0 ms     | 0.90 ms  | 2.00 ms  | 0.39 ms        | 1.23 ms      |
| 5 ms     | 8.22 ms  | 8.26 ms  | 8.19 ms        | 8.70 ms      |
| 20 ms    | 25.14 ms | 25.82 ms | 25.16 ms       | 26.01 ms     |

At 5 ms the four land within half a millisecond of each other; at 20 ms, within
a millisecond. Those are noise, not rankings — no delta you could act on. Any
app that touches a database lives in the second regime, so the raw-SSR ordering
describes frameworks in a vacuum and stops describing your app the moment a real
query enters the loop. That is the reasoning behind where Point0 spends its
budget: HMR, dev start and navigation payloads are costs a faster database
cannot refund.

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

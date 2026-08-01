# `server.trustProxy` — declared proxy topology for `from.ip`

Status: designed, deliberately deferred. `from.clientIp` (shipped) covers the
practical need — geo, per-visitor rate limits, logs — with zero config, by the
right-to-left public scan of the transport chain. What it structurally cannot do
is make a **security-grade** claim: with a public CDN edge that APPENDS itself
to `x-forwarded-for`, the rightmost public hop is the CDN's address, and no
heuristic can tell that apart from a visitor — only declared topology can.

The Express-style option, when someone actually needs it:

- `server.trustProxy` in the engine config: `false` (default — behavior exactly
  as today) | `number` (hops to strip from the right of the chain; `ip` becomes
  `chain[length - 1 - hops]`) | `(ip: string) => boolean` (trusted-hop
  predicate) | `'auto'` (trust headers only when the peer is
  private/CGNAT/loopback — the PaaS case).
- Plumbing: `EngineServerOptions` → `parseEngineServerOptions` →
  `Request0.create` (via the engine fetcher's `prepareFetch`), a new option on
  `Request0.create`.
- With `trustProxy` on, `from.ip` itself becomes the resolved client address —
  legitimate, because the deploy declared the topology; `clientIp` stays the
  config-free heuristic.
- Tests: hops-count form, predicate form, `'auto'` with private vs public peer;
  docs: the "IP resolution" section of `docs/core/request.md` + a new
  reverse-proxy deployment note in `docs/engine/deploy.md`.

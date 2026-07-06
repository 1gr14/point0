# Client chunks — navigation mechanics & deploy invalidation

Two related questions about lazy client chunks. Standalone backlog — not part of
the suspend branch, investigate in its own session.

## 1. Verify the lazy-chunk mechanics on client navigation

What we already know (see dev/docs/suspend.md, "Lazy points don't flash the
wrappers' fallbacks on navigation"): client navigation awaits the chunk BEFORE
rendering (`navigateWithTransitions` → `prefetchPage` → `loadPage` →
`await point()` — the same thunk `React.lazy` uses, so the module cache is warm
when React renders); a point's `React.lazy` boundary sits ABOVE its
`_MountableWithBoundaries` wrapper, so the entry Suspense cannot catch its own
point's chunk load — a cold chunk rendered outside the awaited path lands in the
PARENT layout's boundary; on the server nothing is ever lazy. Covered by the
client-navigation e2e test (no fallback flash in the tale). Most likely
everything is fine — the goal is to KNOW the mechanics, not to fix.

To verify / document / pin:

- **Chunk load FAILURE during navigation** (network down, deploy swapped the
  hashes): where does the `loadPage` rejection land — the navigation's own
  catch, a layout ErrorBoundary, or nowhere? What does the user actually see
  (whose `.error()`), and does the app stay alive?
- **A manually rendered `<lazy.X />`** inside a component body (not reached via
  router navigation): nothing prefetched the chunk — which Suspense boundary
  shows the fallback while it loads, and which ErrorBoundary catches a load
  error?
- **Concurrent navigations**: navigation A's chunk is still loading, the user
  clicks B — is A's load ignored cleanly (no flash, no state corruption)?

Deliverables: a "client chunks" section in dev/docs/suspend.md (or its own
dev/docs page) + a pin test for the failure case.

## 2. Deploy invalidation — stale clients requesting dead chunks

After a new deploy the chunk hashes change. A user who had the site open still
holds the OLD manifest; their next client navigation requests old chunk URLs —
404 or a stale/broken chunk. Decide the framework's answer:

- What is the **recommendation today** (and document it): full page reload on a
  chunk-load error? Keep serving the previous N builds' assets?
- Do we want **built-in behavior**: detect a failed chunk load → hard-reload the
  page once (with a guard against reload loops)? A build-id handshake (e.g. an
  `X-Point0-Build` header / meta tag checked on navigation) that downgrades the
  next client navigation to a full page load when the server build changed?
- Prior art: how Vite (`vite:preloadError`), Next.js, and Remix handle stale
  chunks — steal the best shape.

# Vite Fast Refresh resets state on point-rendered components (bun keeps it)

**Status:** open · **Area:** HMR / react-refresh / mountable points · **Blocks:** full state-preservation
assertions in the `'have hmr client updates'` test (`packages/engine/tests/dev.test.ts`) for the **vite**
bundler.

## Symptom

On the **vite** bundler, editing a file during dev HMR **remounts** the point-rendered components and **resets
their React state** (all `useState` counters back to 0), even though:

- it is a real hot-update (`[vite] hot updated: /page.tsx`, no full reload, no console errors), and
- the bare-mount feature itself works (component renders, content updates propagate).

On the **bun** bundler the same edits **preserve** state. So the test passes on bun and fails on vite at the
first assertion that depends on preserved state after a sibling edit (e.g. `waitContent('Compot 1')` right after
editing the wrapper).

This is **not** caused by the bare-mount work (`<MyComponent />` / `<MyProvider />`). Verified live: editing a
component's own body preserves its own `useState` (`self 1` survived `CCC`→`DDD`). The loss is about
**state of point components when a sibling/parent is edited**, and it pre-dates bare-mount (any page rendered via
`point.X` has it).

## Root cause

react-refresh preserves a component's state across an edit only when that component is a **registered family with a
stable signature**. In the Vite transform of a point file (`@vitejs/plugin-react`), only the user's inner functions
get a signature (`$RefreshSig$`): `PageHome`, `PageHomeWrapper`, `ComponentComp`. The things actually **mounted** are
the point's runtime closures:

- the page is rendered via `point.FC` / `point.Page` (see `RenderPagesTree` →
  `packages/react-dom/src/router.tsx:1203` and `Page: p.FC` in `packages/core/src/client-points.ts:317`),
- `Comp` export = `point.Component`, `page` export = `point.Page`, `incrementMutation` export = the `_tail` decoy.

These are **anonymous, no-signature functions that change identity on every module re-eval** (a new `Point0`
instance is created each HMR eval). Vite's react-refresh, for a changed component family with **no signature**, cannot
prove state is safe to keep, so it **remounts** — wiping the subtree's state. (Editing the inner directly still
preserves, because that inner *does* have a signature and is hot-swapped in place.)

`incrementMutation.useMutation()` used as a hook in the page makes this worse/earlier: it adds a custom hook from a
re-created point to `PageHome`'s signature, pushing the reconciliation into a remount even on a *sibling* (wrapper)
edit. (The committed test uses `fetchMutation()` in an onClick — not a hook — so the exact trigger point may differ,
but the underlying no-signature-point-closure remount is the same.)

## Why bun is fine

Bun's bundler ships its **own** Fast Refresh runtime (not `@vitejs/plugin-react`). It is more lenient and preserves
state for these no-signature point closures where Vite's react-refresh remounts. Same source, two refresh runtimes,
different policy.

## Proposed fix (the real one)

Give the mounted point components and point hooks a **stable identity across HMR re-evals** so react-refresh
(vite) treats them as unchanged and hot-swaps instead of remounting. Options to explore:

1. A per-(scope,type,name) **registry/proxy** that survives module re-eval: `point.X` / `point.FC` resolve through a
   stable wrapper component whose identity never changes; the wrapper looks up the current point at render time.
   Then the *mounted* type is stable, and react-refresh keeps state while the inner (signed) families hot-swap.
2. Or emit a **stable `$RefreshSig$`** for the generated mount component so vite preserves it.
3. Investigate whether `import.meta.hot` handling / `registerExportsForReactRefresh` can be told these exports are
   the same family across evals.

This is an **architectural** change in core/react-dom (not in the bare-mount feature) and needs careful testing on
both vite and bun. Out of scope for the bare-mount work.

## Evidence (manual repro, vite dev server)

- SSR + client render OK: `Compot 0`, hot-update on edit, no reload, no errors.
- Edit component body (`CCC`→`DDD`): component's own `useState` **preserved** (`self 1`) → bare-mount HMR is good.
- Page with `incrementMutation.useMutation()`: editing the **wrapper** → all counters reset to 0.
- Same page **without** the mutation hook: editing the wrapper → **all state preserved**. (Isolates the trigger.)

## References

- Test: `packages/engine/tests/dev.test.ts` → `it('have hmr client updates')` (the vite branch is gated on this
  file).
- Render path: `packages/react-dom/src/router.tsx` (`RenderPagesTree`), `packages/core/src/client-points.ts`
  (`toPagesTree`, `Page: p.FC`).
- Runtime mount: `packages/core/src/point0.ts` (`Page`/`Component`/`Provider`, `_tail`), `_assignNicePointMethodsToComponent`.
- HMR decoy: `packages/compiler/src/point.ts` (`addHmrFix`).

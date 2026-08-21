# `loader-dialect` sometimes disagrees with itself about `.jsx`

**Status:** open, unexplained · **Area:** compiler tests · **Kind:** flake with
a real diff

`packages/compiler/tests/loader-dialect.unit.test.ts` compares two ways of
compiling the same fixture — `buildViaPlugin` (the compiler's Bun plugin) and
`buildViaStoreName` (the relocated-extension path) — and asserts they agree. On
run 32460656005 two cells disagreed, both on `.jsx`:

- `answers the same for JSX in a .jsx file …`
- `answers the same for TypeScript in a .jsx file …`

Every other extension in the 16-cell grid agreed.

## What is already ruled out

- **Not the source.** The only change on that branch versus its own previous
  green runs was `FakeClient.destroy` and a markdown card — nothing the compiler
  reads.
- **Not the `dist` artifact.** `gh run rerun --failed` does not re-run `build`,
  so the rerun consumed the **same** artifact — and `unit (ubuntu-latest)` went
  green on it.
- **Not the machine.** It failed on ubuntu **and** windows in the same run, and
  passed locally on macOS (19 pass) and on the branch's two earlier linux runs.

So: same bytes, same inputs, different answers — `Bun.build` returning a
different `success` for a `.jsx` entrypoint depending on something neither path
declares. Load is the obvious suspect (the `unit` group is the widest one), but
that is a guess, not a finding.

## Where to start

Reach for the disagreement, not the green: loop the two `.jsx` cells under
parallel load and print both `result.success` and `result.logs` from
`buildViaPlugin`. The test throws away the logs (`catch { return false }`), so
today a failure to build and a refusal to claim the file look identical from the
assertion — that alone is worth fixing before hunting further.

## Related

- [ci-flakes](./ci-flakes.md) — the triage map. Unlike the entries there, this
  one carries a real assertion diff.
- [react-scheduler-outlives-dom](./react-scheduler-outlives-dom.md) — the other
  Bun 1.4 surprise, fixed; unrelated in mechanism.

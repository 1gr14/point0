# The playwright helper reads `htmls` before the DOM bridge delivered them

**Status:** open · **Area:** test-infra (`tests/utils/playwright.ts`) ·
**Kind:** harness race

Surfaced on the **v0.3.12** release run (the Bun 1.4 bump), Windows solo lane,
`packages/engine/tests/utils/test/playwright.e2e.test.ts` — two failures, one
cause:

- `page > should track HTML changes` →
  `expect(lastHistory.htmls.length) .toBeGreaterThan(0)`, **Received: 0**.
- `waitContentSequence > should throw timeout error if sequence is not found` →
  the `page.tale` inline snapshot came back missing its entries.

Not a product regression, and not the usual loaded-runner timeout either — it is
an unsynchronised read.

## The race

`setupBridge` exposes `onDomChanged` to the browser; the callback does **not**
push synchronously. It chains onto `domChangeQueue`, and only after
`HtmlView.parse` resolves does the entry land in `history.at(-1).htmls`. Nothing
in the helper or the tests ever awaits that queue. So every reader —
`page.tale`, `page.previews`, and a test touching `history[].htmls` directly —
can observe an empty array while the parse is still in flight, and `tale` is
built from the same array (`previews = lastHistoryItem.htmls.map(...)`), which
is why the snapshot fails in the same breath.

The window is small, so it stayed invisible until the runtime's timing moved
under it. Bun 1.4 moved it; the shape means it was always reachable.

## The fix, when someone picks this up

Drain before reading, not sleep-then-hope: give the readers a
`await page.settleDom()` (await `domChangeQueue`, plus one browser round-trip so
a MutationObserver callback already queued in the page has been delivered) and
call it from `tale`/`previews` and from the tests that read `htmls`. A bare
`waitFor`-style poll on `htmls.length` would fix these two tests and leave the
same hole for the next reader.

## Related

- [ci-flakes](./ci-flakes.md) — the triage rule this card follows: an assertion
  diff is not a load flake. Both failures here carry a real diff, and the cause
  turned out to be structural.

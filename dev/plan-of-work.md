# Point0 docs — plan of work

How we'll run the documentation effort once the code is stable. Companion to
`dev/structure.md` (the canonical structure), `dev/docs.md` (the detailed plan +
tracker), and `dev/writing-docs.md` (how to write one article).

## The one rule: code before docs

Docs written against a moving API rot immediately. Finish the refactor and
**freeze the public API first**, then document.

## Order

1. **Freeze the structure.** `dev/structure.md` is the canonical tree; settle it,
   then I rebuild `dev/docs.md`'s tracker from it.
2. **Pilot 2–3 articles** to set the template (we've done `overview`; next a
   `concepts` page and a `points`/`methods` page). Sergei reviews closely — these
   become the reference subagents imitate.
3. **Foundations first.** Write the `concepts/*` hub pages before the detail
   spokes — everything else links to the point model.
4. **Fan out the rest** (below).
5. **Sergei writes `intro`** last (priority 99), once the rest exists and he's
   seen how it reads.

## Fan-out: a deterministic workflow, not a free-form lead

For the bulk, run an orchestrated workflow — guaranteed coverage plus built-in
verification — not an ad-hoc lead agent, which drifts and forgets on 50 articles.

Per article:

- **writer** subagent — reads the article's `sources` and its tests, runs
  `examples/basic` to watch the behavior, drafts the doc per `dev/writing-docs.md`,
  and adds JSDoc to that feature's public API in the same change (Track B).
- **reviewer** subagent — adversarially checks every claim and snippet against the
  real code (the accuracy gate) and checks voice.
- **orchestrator** — assigns articles by priority (0 → 1 → 2; skips `intro`), keeps
  the `status` in `dev/docs.md`, cross-links related articles at the end, and
  collects for Sergei: (a) plan/structure fixes the writers found, and (b)
  proposed new articles for uncovered features.

Notes:

- Shared state is the `status` field in `dev/docs.md`. Articles are separate files
  (no conflicts); only the orchestrator writes the tracker.
- Work in waves of ~5–8 articles (≈ one category) so Sergei reviews a coherent
  chunk.
- Track B (code comments) happens inside the same article pass — no separate phase.
- `dev/overview.md`, `dev/docs.md`, and `dev/structure.md` are living — writers fix
  them as they learn.

## Review loop (per article)

Drafts ship in English; Sergei reviews in Russian — faster for him.

1. The agent drafts the English article.
2. For review, the agent posts the article **in Russian, in the chat** (a faithful
   rendering) so Sergei reacts in place.
3. They fix it in the chat (in Russian) until Sergei signs off.
4. The agent applies the agreed changes to the **English** doc.
5. The agent records any new authoring lesson into `dev/writing-docs.md`. The
   rules grow from real reviews.

## Sergei's checkpoints — the real quality gate

After each wave, Sergei reads the drafts. Not line-editing — the **essence/feel
check**: did they capture _why_ it's good, in his voice. Agents are reliable on
accuracy and structure; Sergei is the judge of soul. Cheap per-wave, and it
catches drift early.

## When to start

When the code refactor is done and `dev/structure.md` is settled: say go, and I
(1) rebuild `dev/docs.md` from `dev/structure.md`, (2) run the pilot for review,
(3) orchestrate the fan-out in waves with Sergei's checkpoints.

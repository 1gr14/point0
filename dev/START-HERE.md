# START HERE — Point0 docs

You're continuing the effort to write Point0's public documentation for its **v1
launch**. Everything you need is in this `dev/` folder. Read these, in order:

1. `dev/structure.md` — the canonical article structure (category → slug). The
   source of truth for what articles exist.
2. `dev/docs.md` — the plan: rules, the workflow, and the coverage tracker
   (per-article priority / status / sources). Pick work from here.
3. `dev/writing-docs.md` — how to write one article (voice, examples-first,
   accuracy, the review loop). Binding.
4. `dev/plan-of-work.md` — how we orchestrate the writing (waves, writer +
   reviewer, Sergei's checkpoints).
5. `dev/overview.md` — a code-first overview; the reference for tone and format.
   Its public draft is at `docs/intro/overview.md`.

## Where you are

- Worktree: `/Users/iserdmi/cc/worktrees/point0/dev-docs-plan` (branch
  `dev-docs-plan`). Work here, not in the main checkout. Nothing is committed yet.
- Public docs live in `docs/<category>/<slug>.md`. One real draft exists:
  `docs/intro/overview.md`.
- **The code was refactored after this plan was drafted.** Sources, titles, and
  the exact point/method set will have drifted — re-verify against the current
  code and fix `dev/structure.md` + `dev/docs.md` + `dev/overview.md` as you go.

## The job, in short

- Document only what the **current** code and tests actually do. The code wins;
  don't invent API.
- Describe Point0 **plainly — no coined slogans**. Lead with what's genuinely good
  and show it through real examples from `examples/*`. (Real-world reference:
  Sergei's site at `~/cc/projects/devp0nt` runs on Point0; but published snippets
  stay from the public `examples/*`.)
- Use the short builder notation (`root.lets.page('/x')`).
- Write the article **and** add JSDoc to that feature's public API in the same
  change (Track B).
- Present it as a stable v1, confidently — not an early preview.
- `intro/*` is Sergei's (priority 99) — skip it.

## Review loop

Drafts ship in English, but Sergei reviews in **Russian, in the chat**: post the
article in Russian, fix it together in chat, then apply the changes to the English
doc and record any new authoring lesson back into `dev/writing-docs.md`.

## First step

Ask Sergei what the refactor moved, reconcile `dev/structure.md` and `dev/docs.md`
with the current code, then pilot one P0 article (`concepts/points` or a
`points/*` page) and take it through the review loop.

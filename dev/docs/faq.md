# Developer FAQ — naming decisions

Locked answers to "why is it named like that?" questions, so we don't reopen
them. These are deliberate, not accidents — don't "fix" them in a refactor.

## Why is the point builder entry `.lets` (e.g. `root.lets.page('/')`)?

Because it reads as **"let's build one"** — and `.lets` returns a **builder**,
not a finished thing.

You start with `.lets` ("let's make…"), chain the builder methods, and finish
with the kind you're making: `.page()`, `.query()`, `.component()`, … So the
call literally narrates the act of building: _let's_ make → … → _made_ a page.
The verb you open with (`lets`) is mirrored by the kind you close with.

`.define` / `.create` were rejected on purpose: they imply you hand back a ready
object **immediately**, but we return a builder you keep configuring. `.lets`
keeps that "in progress, you finish it" feeling. **Decision: keep `.lets`.**

## Why is the render accessor a bare `.X` (e.g. `<ideaBest.X />`)?

`.X` is just a **short alias** for "the mountable thing this point is" — for a
page it's the Page, for a component the Component (it's literally aliased to
`.Page` / `.Component` internally).

It matters less than it looks, because a component point you mount into the tree
yourself can simply be written `<MyComponent />` — that's the **same** as
`<MyComponent.X />`. The `.X` form exists only for people who prefer to keep
their point exported as a lowercase **object** (`myComponent.fetchQuery()`, …)
and still want a terse way to render it. Their choice. **Decision: keep `.X`.**

## Why is there no indexed `identity` target next to `$identity`?

Considered and rejected (2026-08-01). The idea: `.connector(fn, ['userId'])`
declares indexed identity keys, and targets gain `identity: { userId }` resolved
through a per-key engine index instead of the `$identity` sift scan.

Two facts kill it. First, an index cuts only the LOCAL scan, never the bus: an
identity-addressed command is a broadcast either way, so with 50 processes all
50 still receive and filter — and the local scan it saves is ~1–5 ms per 10k
connections on events that are rare by nature (logout, ban, admin ops). Second,
the only thing that DOES cut the bus is a subscription per value — and that is
exactly what a room is. "Identity as a topic" would duplicate the whole room
machinery (subscribes, resume streams, `amendIdentity`/`refresh` reactions) as a
crooked twin of the enroller-space, which already turns an identity key into a
real topic (`.enroller(({ identity }) => ({ userId: identity.userId }))`) with
bus narrowing and resumability for free.

So the table is complete without it: rare identity selections ride `$identity`
(a flat matcher is already equality sugar), hot per-user addressing rides an
enroller room. An `identity:` key that LOOKS like the hot `room:` address but
works like a filter would only mislead. **Decision: no identity index —
`$identity` for rare scans, enroller rooms for hot addressing.**

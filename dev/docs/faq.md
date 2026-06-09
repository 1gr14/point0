# Developer FAQ — naming decisions

Locked answers to "why is it named like that?" questions, so we don't reopen
them. These are deliberate, not accidents — don't "fix" them in a refactor.

## Why is the point builder entry `.lets` (e.g. `root.lets.page('/')`)?

Because it reads as **"let's build one"** — and `.lets` returns a **builder**,
not a finished thing.

You start with `.lets` ("давай сделаем…"), chain the builder methods, and finish
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

# How we write Point0 docs

The house style for Point0's public documentation. The plan, the article list,
and the coverage tracker live in [`dev/docs.md`](./docs.md); **this** file is
how to actually write one. Read it before you draft.

Two rules cover most of it: **be brief and clear**, and **show everything
through examples**.

## The one idea

**Docs are examples with a thread of prose — not prose with a few examples.**

Developers skim for code, not paragraphs. Lead with code; let the words connect
the examples instead of replacing them. If a line of code can say it, don't
write the sentence.

## Believe the framework, show the feel

Point0 was built by hand over months, and a real site already runs on it. The
job of these docs is to surface what's genuinely good here and let a reader feel
it — because if we don't describe it, no one will.

- **Lead with what's good, not with comparisons.** Whether a mechanism existed
  elsewhere first is not the test; whether Point0 is good to build with is — and
  that shows through real examples and the actual developer experience.
- **Don't hedge value to death.** State what's nice plainly and let the snippet
  prove it. (Stay strict on accuracy — that's separate, and it's what makes the
  praise credible.)
- **Keep finding the good parts.** Writing an article, you'll notice
  capabilities the overview missed. Add them — to `dev/overview.md`'s "A few
  more nice things" and to the positioning notes in `dev/docs.md`.
- **Propose missing articles.** If you hit a feature or approach that doesn't fit
  your article and isn't planned as its own, don't drop it — propose a new
  article: add its slug to `dev/structure.md` (the canonical structure) and flag
  it for Sergei.

## Getting it reviewed

Drafts ship in English, but Sergei reviews in Russian — it's faster for him.

1. Draft the English article per these rules.
2. To get it checked, post the article's content **in Russian, in the chat** (a
   faithful rendering, not just a link) so Sergei can react in place.
3. Fix it together in the chat (in Russian) until he signs off.
4. Apply the agreed changes to the **English** doc.
5. Record any new or changed authoring lesson back into this guide — the rules
   grow from real reviews, so the next article benefits.

## Voice — clarity is the flex

We don't tell the reader the framework is good. We're so clear they figure it
out themselves. If a sentence makes the reader feel smart, keep it. If it makes
the writer look smart, cut it.

- **Cut the water.** Every sentence carries a fact, a step, or a decision. If
  you can delete a word and lose nothing, delete it.
- **One thought per sentence.** Aim under 20 words. Break long ones in two.
- **Lead with the answer.** No throat-clearing intros ("In this guide we
  will…").
- **Concrete over abstract.** Show the thing — a snippet, a value, a name.
- **Verbs, active voice.** "Run the build", not "the build can be executed".
- **Earn every claim.** Don't write "fast" — show the number, or say nothing.
  Facts flex; adjectives beg.

### Write English for the world

Most readers are not native English speakers. Write so a developer in Jakarta,
São Paulo, or Kazan reads it once and gets it.

- Simple words: "use" not "utilize", "help" not "facilitate", "so" not
  "consequently".
- Short, direct sentences. Subject, verb, object.
- Present tense: "the loader runs on the server", not "will run".
- Define a term once, then reuse it. Don't swap synonyms to sound varied —
  consistency helps non-natives.

### Mechanics

- **"you"** for the reader, **"we"** for Point0. Avoid "the user".
- **Headings:** short noun phrases, sentence case ("Define a query", not
  "Defining A Query").
- **Numbers as digits:** "Node 20", "3 schema libs".
- **Bun first.** Lead with `bun` / `bunx` / `point0 …`; mention other tools
  after.
- **Code is ESM.** Show the explicit `.js` import extension where it matters.

## Every article is examples-first

### Open with what-and-why, then a hero example

Two things, in this order, before anything else:

1. **What & why (2–3 sentences).** What the topic is and the one thing that
   makes it worth reading. No feature dump, no hype.
2. **The hero example.** Real, runnable, a bit more than "hello world" — enough
   to prove the value the intro just promised. The reader should _see_ it in 10
   seconds of scanning, before reading a word.

### Then keep leading with code

- **Show, then tell.** Snippet first, one sentence after — not the reverse.
- **Runnable and minimal.** Real names, real values, copy-paste works. Cut every
  line that isn't load-bearing. Pull from `examples/basic` (canonical) or a
  package test; keep it real, don't invent. For a real-world cross-check, Sergei's
  site at `~/cc/projects/devp0nt` runs on Point0 — read it locally to see patterns
  at scale (it's private, so published snippets still come from the public
  `examples/*`).
- **Put the explanation inside the code, as comments.** The comment next to the
  line gets read; the paragraph three lines below gets skipped.
- **Show output where it matters:** `// => { id: 1 }`,
  `// throws: NotFoundError`.

Comment-carried explanation in action — this teaches four things with almost no
prose, and that's the target ratio:

```ts
const ideaViewQuery = root.lets
  .query()
  .input(z.object({ id: z.number() })) // validated; input is typed { id: number }
  .loader(async ({ input }) => {
    return {
      idea: await prisma.idea.findUniqueOrThrow({ where: { id: input.id } }),
    }
  }) // runs on the server only
  .query()

const { data } = ideaViewQuery.useQuery({ id: 1 }) // call it from the client; data.idea is typed
```

### Build the article as a narrative of needs

Don't dump a feature list. Tell a story where each feature appears the moment
the reader would reach for it:

1. Start from the simplest real use.
2. Hit a limit — "but what if two pages need the same data?"
3. Introduce the one feature that solves it, and show it.
4. Move to the next need.

The order of the article is the order a real user meets problems — not the order
the source files are organized. Full API tables and every option go **lower**,
or on a separate reference page. The top is the journey; the bottom is the map.

## Point0 specifics

- **Describe plainly, no slogan.** Don't push a coined term. State what's true:
  you can declare a feature's server and client parts together — even in one
  small file — and the build keeps each side's code where it belongs. Loaders
  run server-side; the client gets typed hooks. Don't dress it up as a movement.
- **Get the point/endpoint nuance right.** Data points — query, mutation, action
  — become real HTTP endpoints (path + OpenAPI). A page can be a plain mountable
  _or_ an endpoint (when it has a loader, or when SSR is on and it ships its
  components' query data). A component that just composes other queries is a
  mountable, not an endpoint. Don't flatten this into "every point is an
  endpoint".
- **Use the short builder notation.** Write `root.lets.page('/x')`, not the
  explicit `root.lets('page', 'x', '/x')` — the compiler fills the point's name
  from the variable, and it works for every point type. The explicit form is
  valid too, but the docs use the short one everywhere. (Only `action` adds
  extra terminal options — note that in the actions article.)
- **Document and comment together.** A feature's article and its code comments are
  one job. Before you write: read the feature's tests — they show the behavior and
  the edge cases. As you write: add or improve the JSDoc/TSDoc on that feature's
  public API in the same change (that's Track B; see `dev/docs.md`). The article
  and the inline comments ship together.
- **Accuracy beats everything.** Document only what is implemented and exercised
  by `examples/*` or `packages/*/tests`. Verify every snippet against its
  source. When a note or an assumption disagrees with the actual file, the file
  wins.
- **Stable at v1.** Point0 is published at version 1 — document the public API
  as stable, with no "early / preview / will change" hedging. Still: never
  document roadmap items (the `?`-prefixed lines and future sections in
  `todo.txt` aren't features yet), and flag the rare genuinely-experimental API
  explicitly.
- **Security notes that must appear** where relevant: the client is a SPA —
  never leave secret content on a page; a point's `ctx`/loaders only run when
  the point _has_ loaders, so for auth-only gating use a `.with(...)` wrapper,
  not `ctx`.

## Frontmatter & files

- **Location:** `docs/<category-slug>/<article-slug>.md`.
- **Slug = the file name** (without `.md`). The category is cosmetic — not part
  of the slug — so every slug is unique across the whole site.
- **Frontmatter (YAML):** `title` (the H1 — don't repeat it as `#` in the body),
  `description` (one sentence, for listings/SEO), `index` (order within the
  category). Example-showcase pages also add `label` and `example` (the example
  dir path). Register a new category in `docs/categories.json` the first time an
  article lands in it.

## Gaps — the `TODO:` marker

Where an article needs depth you can't yet fill, drop a one-line, specific
callout: `> **TODO:** explain X once Y is settled`. Grep `TODO:` to find gaps.
We can later swap these for a nicer docs component.

## Definition of done

Frontmatter complete · at least one real, **verified** snippet · output shown
where it matters · gotchas covered · cross-links added · no stray `TODO:` (or
only intentional ones) · reviewed by a second pass.

## Anti-patterns

These make docs hard to trust. Avoid all of them:

- A wall of prose before any code.
- An API reference table as the first thing after the title.
- An abstract description where a concrete example would do.
- A feature listed with no reason to care about it.
- "Configuration options" dumped without an example of each.
- Marketing adjectives ("powerful", "seamless", "blazing-fast") where a snippet
  would prove the point.
- Explaining in a paragraph what a code comment could say in four words.
- Hedging ("this might possibly help") and filler ("it is important to note").

## Checklist

Read the article once before shipping and ask:

- [ ] Can a reader grasp the value in 10 seconds of scanning?
- [ ] Is there runnable code high up, before any long prose?
- [ ] Does the hero example show more than "hello world"?
- [ ] Does every feature appear because a need was shown first?
- [ ] Is explanation pushed into code comments where it can be?
- [ ] Do examples show output where it matters?
- [ ] Is the deep reference below the narrative, not above it?
- [ ] Is every snippet verified against the real code?
- [ ] Is the model framed right (not "server then client")?
- [ ] Can I cut more words?

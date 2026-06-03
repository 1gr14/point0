# Point0 docs — structure

The **canonical, short view** of the docs structure — the tree of category →
article slug, nothing else (no titles, priorities, or sources). It's the quick
map; keep it. Reorganize freely, and **add new articles here** — you, or an agent
that proposes one. When it changes, tell me and I rebuild `dev/docs.md`'s detailed
tracker from it (re-deriving titles/sources/priorities for anything renamed,
moved, or new).

Rules of the tree:

- A **slug** is the article's file name and must be unique across the whole site.
- A **category** is just the folder/section it sits in — move slugs between
  categories freely; the category is not part of the slug.

---

- intro
  - overview
  - getting-started // тут и будет про криэйт апп исопльзваоться
  - project-structure // тут важно сделать пометку какое будет отличие при использованиии вайта (там в индекс хтмл надо другие пути чуть указать, и загрузку бан плагинов вкомпилере можно отоключить)
  - why-point0

- concepts
  - engine
  - compiler что мы копилируем и зачем и как настраивается
  - generator что мы генрируем и зачем
  - points // тут перечисляем все поминты и когда какой исопльзвоать иссылки на доку каждого поинта. также прямо тут мы скажем что есть у нас моантаблс page,layout, component, provider которые реально вставляются в jsx так или иначе
  - methods // тут переичсляем ключеваы методы .loader() .input() говорим в каких поинтах исопльзуется и что это всегда по сути одно, то есть выбрать методы которые много где есть. По сути во многом повторяет поинтсы но в разрезе методов
  - validation
  - error-handling
  - ssr // обхяснем как у нас вообще сср работает, что хоть включил хоть выключил всё пашет, и тут же про clientOnly
  - navigation // как мы создаём навигацию и как потом с не йработать
  - cli
  - mcp
  - workflow // dev-workflow который

- blocks
  - env // всё про наш env хелпер
  - ssr-store
  - head
  - cookie-store
  - events
  - mdx
  - request // про сам наш реквест и гед и как он доступен в точках и глобально
  - effects // про эффекты респонса и как они досутпны глобально
  - plugins // локальные плагины, пишутся в своём же коде и вмонтируются куда угодно

- points // у каждого поинта своя страница (как создавать и использовать); нормально переиспользовать/ссылаться на другие поинты; не гонять юзера, но и не повторять лишнее. Набор сверить по финальному коду после рефактора
  - root
  - base
  - page
  - layout
  - component
  - provider
  - query
  - infinite-query
  - mutation
  - action

- methods // крупные переиспользуемые методы; каждый — своя страница, на них ссылаются концепты (напр. про loader — подробно, как он проявляется в каждом поинте)
  - loader
  - with
  - wrapper
  - middleware // .middleware — вмонтировать любой эндпоинт (better-auth и т.п. из коробки)

- packages
  - openapi
  - basic-auth
  - cors
  - docs

- guides
  - better-auth
  - uploads
  - testing
  - deployment

- examples
  - basic
  - vite
  - better-auth
  - expo
  - capacitor

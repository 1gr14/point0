import { describe, expect, it } from 'bun:test'
import { Point0 } from '@point0/core'
import { QueryClient } from '@tanstack/react-query'
import path from 'node:path'
import url from 'node:url'
import ts from 'typescript'
import z from 'zod'
import { createTestThings, waitReturn } from './utils/internal-testing.js'

describe('infinityQuery', () => {
  const items: Array<{ id: number; name: string }> = [
    { id: 1, name: 'Item 1' },
    { id: 2, name: 'Item 2' },
    { id: 3, name: 'Item 3' },
    { id: 4, name: 'Item 4' },
    { id: 5, name: 'Item 5' },
  ]
  const createRoot = () =>
    Point0.lets('root', 'root')
      .loading(() => <div id="loading">...</div>)
      .error(({ error }) => <div id="error">{error.message}</div>)
      .queryOptions({
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchInterval: false,
        refetchIntervalInBackground: false,
      })
      .root()

  it('simple', async () => {
    const root = createRoot()
    const q = root
      .lets('infiniteQuery', 'test')
      .input(z.object({ cursor: z.number().optional() }))
      .loader(({ input }) => {
        const cursor = input.cursor ?? 0
        const nextCursor = cursor + 2
        return {
          items: items.slice(cursor, cursor + 2),
          nextCursor: nextCursor < items.length ? nextCursor : undefined,
        }
      })
      .infiniteQuery({
        pageParamFromInput: {
          get: ({ input, get }) => get(input, 'cursor'),
          set: ({ input, value, set }) => set(input, 'cursor', value),
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialPageParam: 0,
      })
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useInfiniteQuery()
      const itms = query.data?.pages.flatMap((page) => page.items) ?? []
      const nextCursor = query.data?.pages.at(-1)?.nextCursor
      if (query.isLoading) {
        return <div id="loading">...</div>
      }
      return (
        <div id="page">
          {itms.map((item) => (
            <div key={item.id}>{item.name}</div>
          ))}
          {nextCursor && (
            <button
              id="more"
              onClick={() => {
                void query.fetchNextPage()
              }}
            >
              Load more
            </button>
          )}
        </div>
      )
    })

    const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
      ssr: true,
      points: [root, q, page],
    })
    await render(page.route(), async ({ waitContent, tale, click }) => {
      await waitContent('#more')
      await click('#more')
      await waitContent('Item 4')
      await click('#more')
      await waitContent('Item 5')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #loading: ...

            #page:
              div: Item 1
              div: Item 2
              #more: Load more

            #page:
              div: Item 1
              div: Item 2
              div: Item 3
              div: Item 4
              #more: Load more

            #page:
              div: Item 1
              div: Item 2
              div: Item 3
              div: Item 4
              div: Item 5
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        infiniteQuery.test (client) < {"cursor":0}
        infiniteQuery.test (client) < {"cursor":2}
        infiniteQuery.test (client) < {"cursor":4}
        "
      `)
    fetchRecorder.prune()
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page:
          div: Item 1
          div: Item 2
          #more: Load more
        "
      `)
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) (page) < {}
        infiniteQuery.test (server) < {"cursor":0}
        "
      `)
  })

  it('with page loader and query loader', async () => {
    const root = createRoot()
    const q = root
      .lets('query', 'test')
      .loader(async () => await waitReturn({ x: 1 }))
      .query()
    const page = root
      .lets('page', 'home', '/')
      .loader(async () => await waitReturn({ y: 2 }))
      .page(({ data }) => {
        const query = q.useQuery()
        return (
          <div id="page">
            q={query.data?.x ?? 'nothing'} y={data.y}
          </div>
        )
      })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #loading: ...

            #page: q=nothing y=2

            #page: q=1 y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        page.home (client) < {}
        query.test (client) < {}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: q=1 y=2
        "
      `)
  })

  it('with clientLoader', async () => {
    const root = createRoot()
    const q = root
      .lets('query', 'test')
      .clientLoader(() => ({ y: 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery()
      return <div id="page">y={query.data?.y ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: y=nothing

            #page: y=2
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: y=nothing
        "
      `)
  })

  it('with input and loader', async () => {
    const root = createRoot()
    const q = root
      .lets('query', 'test')
      .input(z.object({ y: z.number() }))
      .loader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery({ y: 123 })
      return <div id="page">x={query.data?.x ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: x=nothing

            #page: x=246
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "
        query.test (client) < {"y":123}
        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=246
        "
      `)
  })

  it('with input and clientLoader', async () => {
    const root = createRoot()
    const q = root
      .lets('query', 'test')
      .sharedInput(z.object({ y: z.number() }))
      .clientLoader(({ input }) => ({ x: input.y * 2 }))
      .query()
    const page = root.lets('page', 'home', '/').page(() => {
      const query = q.useQuery({ y: 123 })
      return <div id="page">x={query.data?.x ?? 'nothing'}</div>
    })

    const { render, fetchPreview, fetchesTale } = await createTestThings({ ssr: true, points: [root, q, page] })
    await render(page.route(), async ({ waitContent, tale }) => {
      await waitContent('#page')
      expect(await tale()).toMatchInlineSnapshot(`
          "
          /
            #page: x=nothing

            #page: x=246
          "
        `)
    })
    expect(await fetchesTale()).toMatchInlineSnapshot(`
        "

        "
      `)
    expect(await fetchPreview(page)).toMatchInlineSnapshot(`
        "
        #page: x=nothing
        "
      `)
  })

  describe('helpers', () => {
    it('infinite query helper methods', async () => {
      const root = createRoot()
      const q = root
        .lets('infiniteQuery', 'helpers')
        .sharedInput(z.object({ cursor: z.number().optional() }))
        .clientLoader(({ input }) => {
          const cursor = input.cursor ?? 0
          return {
            items: [{ id: cursor + 1, name: `Item ${cursor + 1}` }],
            nextCursor: cursor + 1,
          }
        })
        .infiniteQuery({
          pageParamFromInput: 'cursor',
          getNextPageParam: (lastPage) => lastPage.nextCursor,
          initialPageParam: 0,
        })
      const queryClient = new QueryClient()
      const input = { cursor: 0 }
      const options = { queryClient, mode: 'client' as const }

      const fetched = await q.fetchInfiniteQuery(input, undefined, options)
      expect(fetched.pages).toEqual([{ items: [{ id: 1, name: 'Item 1' }], nextCursor: 1 }])
      expect(fetched.pageParams).toEqual([0])
      expect(q.getInfiniteQueryData(input, options)).toEqual(fetched)

      await q.prefetchInfiniteQuery(input, undefined, options)
      expect(await q.ensureInfiniteQueryData(input, undefined, options)).toEqual(fetched)

      q.setInfiniteQueryData(
        input,
        ((old: any) => ({
          pages: [
            ...old.pages,
            {
              items: [{ id: 99, name: 'Item 99' }],
              nextCursor: undefined,
            },
          ],
          pageParams: [...old.pageParams, 99],
        })) as any,
        undefined,
        options,
      )

      const updated = q.getInfiniteQueryData(input, options) as any
      expect(updated.pages).toEqual([
        { items: [{ id: 1, name: 'Item 1' }], nextCursor: 1 },
        { items: [{ id: 99, name: 'Item 99' }], nextCursor: undefined },
      ])
      expect(updated.pageParams).toEqual([0, 99])
      expect(q.getInfiniteQueryCache(input, options)?.state.data).toEqual(updated)
      const allCached = q.getInfiniteQueriesCache(true, options)
      expect(allCached.length).toBe(1)
      expect((q.getInfiniteQueryState(input, options) as any)?.data).toEqual(updated)

      await q.refetchInfiniteQuery(input, undefined, options)
      await q.cancelInfiniteQuery(input, undefined, options)
      await q.invalidateInfiniteQuery(input, undefined, options)
      expect((q.getInfiniteQueryState(input, options) as any)?.isInvalidated).toBe(true)
      await q.resetInfiniteQuery(input, undefined, options)
      expect(q.getInfiniteQueryData(input, options)).toBeUndefined()

      q.removeInfiniteQuery(input, options)
      expect(q.getInfiniteQueryData(input, options)).toBeUndefined()
      expect(q.getInfiniteQueriesCache(true, options)).toEqual([])
    })
  })
})

// ────────────────────────────────────────────────────────────────────────────────────────────────
// Editor experience for `.infiniteQuery(options)`. Like `with`, the options surface is produced by
// the (big) `infiniteQuery` signature. It used to be three overloads, which meant the language
// server couldn't decide which to complete the options object against — so `.infiniteQuery({ ▮ })`
// offered a giant global list (nothing useful, "never until correct") and a wrong call collapsed to
// "No overload matches this call". A single signature fixes both. These tests drive the TypeScript
// language service over the *source* types and assert the real completions and diagnostics, so a
// future edit that silently degrades them fails here.
const iqProbe = `
import { Point0 } from '@point0/core'
import { z } from 'zod'

const root = Point0.lets('root', 'root').loading(() => null).error(() => null).root()

const iq = root
  .lets('infiniteQuery', 'reqd')
  .input(z.object({ cursor: z.number().optional() }))
  .loader(({ input }) => {
    const cursor = input.cursor ?? 0
    return { items: [] as { id: number }[], nextCursor: cursor as number | undefined }
  })

iq.infiniteQuery({}) /* EMPTY */
iq.infiniteQuery({
  pageParamFromInput: {
    get: ({ input, get }) => get(input, 'cursor'),
    set: ({ input, value, set }) => set(input, 'cursor', value),
  },
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  initialPageParam: 0,
}) /* OKAY */
const _complete = iq.infiniteQuery({ /*CURSOR*/ })

// a point with no loader can't be finalized as an infinite query
root.lets('infiniteQuery', 'noload').infiniteQuery({}) /* NOLOADER */
`

const iqEngineDir = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..')
const iqProbePath = path.join(iqEngineDir, 'tests', '__iq_dx_probe__.tsx')
const iqParsed = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(iqEngineDir, 'tsconfig.json'), ts.sys.readFile).config,
  ts.sys,
  iqEngineDir,
)
const iqOptions: ts.CompilerOptions = { ...iqParsed.options, noEmit: true }
delete iqOptions.rootDir
const iqHost: ts.LanguageServiceHost = {
  getScriptFileNames: () => [iqProbePath],
  getScriptVersion: () => '1',
  getScriptSnapshot: (f) =>
    f === iqProbePath
      ? ts.ScriptSnapshot.fromString(iqProbe)
      : ts.sys.fileExists(f)
        ? ts.ScriptSnapshot.fromString(ts.sys.readFile(f)!)
        : undefined,
  getCurrentDirectory: () => iqEngineDir,
  getCompilationSettings: () => iqOptions,
  getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  fileExists: ts.sys.fileExists,
  readFile: ts.sys.readFile,
  readDirectory: ts.sys.readDirectory,
  directoryExists: ts.sys.directoryExists,
  getDirectories: ts.sys.getDirectories,
  realpath: ts.sys.realpath,
}
const iqService = ts.createLanguageService(iqHost, ts.createDocumentRegistry())
const iqSourceFile = iqService.getProgram()!.getSourceFile(iqProbePath)!
const iqDiagnostics = iqService.getSemanticDiagnostics(iqProbePath)
const iqCodesOf = (tag: string) => {
  const line = iqSourceFile.getLineAndCharacterOfPosition(iqProbe.indexOf(tag)).line
  return iqDiagnostics
    .filter((d) => d.start !== undefined && iqSourceFile.getLineAndCharacterOfPosition(d.start).line === line)
    .map((d) => d.code)
}
const iqMessageOf = (tag: string) => {
  const line = iqSourceFile.getLineAndCharacterOfPosition(iqProbe.indexOf(tag)).line
  const d = iqDiagnostics.find(
    (x) => x.start !== undefined && iqSourceFile.getLineAndCharacterOfPosition(x.start).line === line,
  )
  return d ? ts.flattenDiagnosticMessageText(d.messageText, '\n') : ''
}

describe('infiniteQuery — what the developer sees in the editor (autocomplete & type errors)', () => {
  it('offers the infinite-query option fields while typing the options object', () => {
    // The developer finalizes an infinite query and starts typing its options:
    //
    //     point.infiniteQuery({ ▮ })
    //
    // They expect the editor to suggest `getNextPageParam`, `initialPageParam`, `pageParamFromInput`.
    // With the old three-overload signature the language server gave a useless global list instead —
    // you had to already know the option names ("never until correct"). We assert member-completion.
    const completions = iqService.getCompletionsAtPosition(iqProbePath, iqProbe.indexOf('/*CURSOR*/'), {})
    const names = (completions?.entries ?? []).map((e) => e.name)
    expect(completions?.isMemberCompletion).toBe(true)
    expect(names).toContain('getNextPageParam')
    expect(names).toContain('initialPageParam')
    expect(names).not.toContain('Point0')
  })

  it('flags the missing required options when called with {} (the required fields ARE the error)', () => {
    // Author calls it but hasn't filled in the required options:
    //
    //     point.infiniteQuery({})        // ← getNextPageParam / initialPageParam missing
    //
    // We want one precise argument error (code 2345) pointing at `{}`, whose message lists the
    // missing required fields — not the old "No overload matches this call".
    expect(iqCodesOf('/* EMPTY */')).toContain(2345)
  })

  it('accepts a fully-specified options object with no error', () => {
    // The happy path must stay clean — pageParamFromInput / getNextPageParam / initialPageParam all
    // provided, and their callbacks (`lastPage`, `input`) are correctly typed from the loader output.
    expect(iqCodesOf('/* OKAY */')).toEqual([])
  })

  it('blocks finalizing a loader-less point with a readable "has no loaders" message', () => {
    // You can't make an infinite query out of a point that has no loader:
    //
    //     root.lets('infiniteQuery', 'x').infiniteQuery({})   // ← no .loader() yet
    //
    // The signature swaps the options argument for a ShowError carrying the explanation, so the
    // error text itself tells the author what to do.
    expect(iqMessageOf('/* NOLOADER */')).toContain('has no loaders')
  })
})

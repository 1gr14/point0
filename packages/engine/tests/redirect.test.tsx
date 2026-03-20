// import { Point0 } from '@point0/core'
// import { describe, expect, it } from 'bun:test'
// import { createTestThings } from './utils/internal-testing.js'

// describe.skip('redirect', () => {
//   const createRoot = () =>
//     Point0.lets('root', 'root')
//       .loading(() => <div id="loading">...</div>)
//       .error(({ error }) => <div id="error">{error.message}</div>)
//       .queryOptions({
//         retry: false,
//         refetchOnMount: false,
//         refetchOnWindowFocus: false,
//         refetchOnReconnect: false,
//         refetchInterval: false,
//         refetchIntervalInBackground: false,
//       })
//       .root()

//   describe('page by method', () => {
//     it('static string', async () => {
//       const root = createRoot()
//       const page1 = root
//         .lets('page', 'page1', '/1')
//         .redirect('/2')
//         .page(() => <div id="page1">content</div>)
//       const page2 = root.lets('page', 'page2', '/2').page(() => <div id="page2">content</div>)
//       const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
//         ssr: true,
//         points: [root, page1, page2],
//       })
//       await render(page1.route(), async ({ waitContent, tale }) => {
//         await waitContent('#page2')
//         expect(await tale()).toMatchInlineSnapshot(`
//           "
//           /
//             #page2: content
//           "
//         `)
//       })
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)

//       fetchRecorder.prune()
//       expect(await fetchPreview(page)).toMatchInlineSnapshot(`
//         "
//         #page: x=nothing
//         "
//       `)
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)
//     })

//     it('dynamic string', async () => {
//       const root = createRoot()
//       const page1 = root
//         .lets('page', 'page1', '/x/:id')
//         .redirect(({ params }) => page2.route({ id: params.id }))
//         .page(() => <div id="page1">content</div>)
//       const page2 = root.lets('page', 'page2', 'y/:id').page(() => <div id="page2">content</div>)
//       const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
//         ssr: true,
//         points: [root, page1, page2],
//       })
//       await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
//         await waitContent('#page2')
//         expect(await tale()).toMatchInlineSnapshot(`
//           "
//           /
//             #page2: content
//           "
//         `)
//       })
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)

//       fetchRecorder.prune()
//       expect(await fetchPreview(page)).toMatchInlineSnapshot(`
//         "
//         #page: x=nothing
//         "
//       `)
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)
//     })

//     it('conditional', async () => {
//       const root = createRoot()
//       const page1 = root
//         .lets('page', 'page1', '/x/:id')
//         .redirect(({ params }) => (params.id === '1' ? page2.route({ id: params.id }) : undefined))
//         .page(() => <div id="page1">content</div>)
//       const page2 = root.lets('page', 'page2', 'y/:id').page(() => <div id="page2">content</div>)
//       const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
//         ssr: true,
//         points: [root, page1, page2],
//       })
//       await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
//         await waitContent('#page2')
//         expect(await tale()).toMatchInlineSnapshot(`
//           "
//           /
//             #page2: content
//           "
//         `)
//       })
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)

//       fetchRecorder.prune()
//       expect(await fetchPreview(page)).toMatchInlineSnapshot(`
//         "
//         #page: x=nothing
//         "
//       `)
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)

//       fetchRecorder.prune()
//       await render(page1.route({ id: '2' }), async ({ waitContent, tale }) => {
//         await waitContent('#page1')
//         expect(await tale()).toMatchInlineSnapshot(`
//           "
//           /
//             #page1: content
//           "
//         `)
//       })
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)
//     })

//     it('with loader before redirct', async () => {
//       const root = createRoot()
//       const page1 = root
//         .lets('page', 'page1', '/x/:id')
//         .loader(({ params }) => ({ result: params.id + '-page1' }))
//         .redirect(({ params }) => (params.id === '1' ? page2.route({ id: params.id }) : undefined))
//         .page(({ data }) => <div id="page1">content {data.result}</div>)
//       const page2 = root
//         .lets('page', 'page2', 'y/:id')
//         .loader(({ params }) => ({ result: params.id + '-page2' }))
//         .page(({ data }) => <div id="page2">{data.result}</div>)
//       const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
//         ssr: true,
//         points: [root, page1, page2],
//       })
//       await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
//         await waitContent('#page2')
//         expect(await tale()).toMatchInlineSnapshot(`
//           "
//           /
//             #page2: content
//           "
//         `)
//       })
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)

//       fetchRecorder.prune()
//       expect(await fetchPreview(page)).toMatchInlineSnapshot(`
//         "
//         #page: x=nothing
//         "
//       `)
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)
//     })

//     it('with loader after redirct', async () => {
//       const root = createRoot()
//       const page1 = root
//         .lets('page', 'page1', '/x/:id')
//         .redirect(({ params }) => (params.id === '1' ? page2.route({ id: params.id }) : undefined))
//         .loader(({ params }) => ({ result: params.id + '-page1' }))
//         .page(({ data }) => <div id="page1">content {data.result}</div>)
//       const page2 = root
//         .lets('page', 'page2', 'y/:id')
//         .loader(({ params }) => ({ result: params.id + '-page2' }))
//         .page(({ data }) => <div id="page2">{data.result}</div>)
//       const { render, fetchPreview, fetchesTale, fetchRecorder } = await createTestThings({
//         ssr: true,
//         points: [root, page1, page2],
//       })
//       await render(page1.route({ id: '1' }), async ({ waitContent, tale }) => {
//         await waitContent('#page2')
//         expect(await tale()).toMatchInlineSnapshot(`
//           "
//           /
//             #page2: content
//           "
//         `)
//       })
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)

//       fetchRecorder.prune()
//       expect(await fetchPreview(page)).toMatchInlineSnapshot(`
//         "
//         #page: x=nothing
//         "
//       `)
//       expect(await fetchesTale()).toMatchInlineSnapshot(`
//         "

//         "
//       `)
//     })
//   })

//   describe('page by method', () => {})
// })

// // ? redirect moves to final stage
// // ? redirect as method is just shortcut for with((...args) => redirect(...args))
// // ? method redirect not needed with is enough (why )
// // ? lets redirect helper that just imitate action that redirects
// // with can return redirect
// // redirect can returns tuple, with status as first argument
// // redirect adds to mount actions and server actions
// // redirect stops monts and server execution
// // fetchServer should read redirect task from headers, and do this by router redirect
// // wouter RedirctSimple and createRedirect
// // ? deepftch shmetch should on... prefetchQuery when recieved redirect should...
// // on fetchPage if result is redirect, then we send real 302 or what redirect
// // on qeruyFetch if result redirect, we do client redirect
// // Квери после получения редиректа должна удалить его из кеша
// // fetchServer shoul accept onRedirect instructions else it throws
// // Разбить роутер на Стейт локейшен и хелперс провайдер

// // ? При фетче пейджа делать экзекьют, потому что там может быть выкинута какая-то ошибка
// // ? Дата пусть будет дата не первый квери, а именно собственного лоадера

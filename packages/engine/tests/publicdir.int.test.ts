import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout } from 'bun:test'
import type { Engine } from '../src/engine.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import type {
  TestProjectOneClient,
  TestProjectOneClientFactoryCreateProjectOptions,
} from './utils/project.one-client.js'
import { bundlers } from './utils/focus.js'

setDefaultTimeout(80000)

const tpf = TestProjectOneClientFactory.create({
  namespace: 'publicdir',
  portsRange: [3700, 3799],
})

type ItFn = (done: (err?: unknown) => void) => void | Promise<void>
type ProcessMode = 'dev' | 'build'

const processModes: ProcessMode[] = ['dev', 'build']
// const bundler = 'bun' as Bundler

const clientPublicdirLine = `    publicdir: { source: '../public', outdir: '../dist/client' },`
const serverPublicdirLine = `   // publicdir: server,`

let preventFinalFilesCleanup = false
function wrp(
  options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
  callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
): ItFn
function wrp(callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>): ItFn
function wrp(
  ...args:
    | [callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>]
    | [
        options: TestProjectOneClientFactoryCreateProjectOptions & { preserve?: boolean },
        callback: ({ tp, engine }: { tp: TestProjectOneClient; engine: Engine }) => void | Promise<void>,
      ]
): ItFn {
  const [options, callback] = args.length === 1 ? [{}, args[0]] : args
  const { preserve = false, ...tpOptions } = options
  if (preserve) {
    preventFinalFilesCleanup = true
  }
  const tp = tpf.create({ ...tpOptions, fixedId: preserve })
  return async () => {
    try {
      await tp.cleanup('ports')
      await tp.init()
      const engine = await tp.importEngine()
      await callback({ tp, engine })
      await tp.cleanup({ files: !preserve, ports: true, processes: true })
    } catch (error) {
      void tp.cleanup({ files: !preserve, ports: true, processes: true })
      throw error
    }
  }
}

async function startProject(tp: TestProjectOneClient, processMode: ProcessMode): Promise<void> {
  if (processMode === 'dev') {
    tp.spawn(['bun', 'run', 'dev'])
    await tp.waitStarted()
  } else {
    await tp.generate()
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
    const engine = await tp.importEngine()
    tp.spawn(['bun', 'run', 'start'])
    await tp.waitStarted(engine.server.port)
  }
}

async function configureServerPublicdir(tp: TestProjectOneClient, source: string): Promise<void> {
  await tp.replace(tp.files.engine, clientPublicdirLine, `      // client publicdir disabled`)
  await tp.replace(
    tp.files.engine,
    serverPublicdirLine,
    `${serverPublicdirLine}
    publicdir: { source: ${source}, outdir: '../dist/server/public' },`,
  )
}

async function expectServerTextAndType(
  tp: TestProjectOneClient,
  path: string,
  text: string,
  contentType: string | string[],
): Promise<void> {
  const response = await tp.fetchServer(path)
  expect(response.status).toBe(200)
  const responseContentType = response.headers.get('content-type') ?? ''
  const expectedTypes = Array.isArray(contentType) ? contentType : [contentType]
  expect(expectedTypes.some((expectedType) => responseContentType.includes(expectedType))).toBeTrue()
  expect(await response.text()).toBe(text)
}

describe('publicdir', () => {
  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: false })
  })

  afterAll(async () => {
    void tpf.cleanup({ files: !preventFinalFilesCleanup, processes: true, ports: true, browser: false })
  })

  describe.each(bundlers)('%s', (bundler) => {
    describe.each(processModes)('%s', (processMode) => {
      it(
        'serves server publicdir from string source',
        wrp({ vite: bundler === 'vite' }, async ({ tp }) => {
          await tp.write('public/server-string.txt', 'server-string')
          await tp.write('public/server-data.json', '{"ok":true}')
          await tp.write('public/server-style.css', 'body{color:red}')
          await tp.write('public/server-page.html', '<!doctype html><title>publicdir</title>')
          await tp.write('public/server-script.js', 'console.info("publicdir")')
          await tp.write(
            'public/server-icon.svg',
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>`,
          )
          await configureServerPublicdir(tp, `'../public'`)
          await startProject(tp, processMode)

          await expectServerTextAndType(tp, '/hello.txt', 'Hi!', 'text/plain')
          await expectServerTextAndType(tp, '/server-string.txt', 'server-string', 'text/plain')
          await expectServerTextAndType(tp, '/server-data.json', '{"ok":true}', 'application/json')
          await expectServerTextAndType(tp, '/server-style.css', 'body{color:red}', 'text/css')
          await expectServerTextAndType(tp, '/server-page.html', '<!doctype html><title>publicdir</title>', 'text/html')
          await expectServerTextAndType(tp, '/server-script.js', 'console.info("publicdir")', [
            'application/javascript',
            'text/javascript',
          ])
          await expectServerTextAndType(
            tp,
            '/server-icon.svg',
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>`,
            'image/svg+xml',
          )
        }),
      )

      it(
        'serves server publicdir from mixed array source',
        wrp({ vite: bundler === 'vite' }, async ({ tp }) => {
          await tp.write('public/server-array-string.txt', 'server-array-string')
          await configureServerPublicdir(
            tp,
            `[
      '../public',
      {
        '/server-array-response.json': () => '{"via":"array-response"}',
      },
      [
        '/server-array-function.css',
        () => 'body{--from:array-function}',
      ],
      [
        '/server-array-async-function.js',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          return 'console.info("array-async-function")'
        },
      ],
    ]`,
          )
          await startProject(tp, processMode)

          await expectServerTextAndType(tp, '/hello.txt', 'Hi!', 'text/plain')
          await expectServerTextAndType(tp, '/server-array-string.txt', 'server-array-string', 'text/plain')
          await expectServerTextAndType(
            tp,
            '/server-array-response.json',
            '{"via":"array-response"}',
            'application/json',
          )
          await expectServerTextAndType(tp, '/server-array-function.css', 'body{--from:array-function}', 'text/css')
          await expectServerTextAndType(tp, '/server-array-async-function.js', 'console.info("array-async-function")', [
            'application/javascript',
            'text/javascript',
          ])
        }),
      )

      it(
        'serves server publicdir from object with string-producing functions',
        wrp({ vite: bundler === 'vite' }, async ({ tp }) => {
          await configureServerPublicdir(
            tp,
            `{
      '/server-object-response.html': () => '<h1>object-response</h1>',
      '/server-object-function.svg': () =>
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle cx="0.5" cy="0.5" r="0.5"/></svg>',
      '/server-object-async-function.json': async () => {
        await new Promise((resolve) => setTimeout(resolve, 100))
        return '{"via":"object-async-function"}'
      },
    }`,
          )
          await startProject(tp, processMode)

          await expectServerTextAndType(tp, '/server-object-response.html', '<h1>object-response</h1>', 'text/html')
          await expectServerTextAndType(
            tp,
            '/server-object-function.svg',
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><circle cx="0.5" cy="0.5" r="0.5"/></svg>',
            'image/svg+xml',
          )
          await expectServerTextAndType(
            tp,
            '/server-object-async-function.json',
            '{"via":"object-async-function"}',
            'application/json',
          )
        }),
      )

      it(
        'merges multiple record string directory definitions',
        wrp({ vite: bundler === 'vite' }, async ({ tp }) => {
          await tp.write('public-a/one.txt', 'from-a')
          await tp.write('public-b/two.json', '{"from":"b"}')
          await configureServerPublicdir(
            tp,
            `[
      { '/a': '../public-a' },
      { '/b': '../public-b' },
    ]`,
          )
          await startProject(tp, processMode)

          await expectServerTextAndType(tp, '/a/one.txt', 'from-a', 'text/plain')
          await expectServerTextAndType(tp, '/b/two.json', '{"from":"b"}', 'application/json')
        }),
      )
    })
  })
})

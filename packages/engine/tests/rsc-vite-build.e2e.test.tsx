// RSC browser e2e — a real dev/prod server + a real Chromium. The four rsc-*.e2e files split what used
// to be one file so each solo CI runner launches exactly ONE browser (a single file carried 4 launches =
// 4× the launch-flake exposure, and one bad describe cascaded into the rest). The fixture pages, project
// boot and every shared assertion body live in ./utils/rsc-e2e.tsx — the same assertions run against the
// bun and vite projects, proving the RSC contract is bundler-independent. In-process RSC coverage (no
// browser) is rsc.int.test.tsx; this lane covers what it cannot: real hydration, interactivity, chunks.

import { afterAll, beforeAll, describe, it, setDefaultTimeout } from 'bun:test'
import { PlaywrightBrowser } from './utils/playwright.js'
import type { TestProjectOneClient } from './utils/project.one-client.js'
import { TestProjectOneClientFactory } from './utils/project.one-client.js'
import {
  bootRscProject,
  expectRscComponentChunkManifest,
  expectRscProductionFlow,
  expectRscStripGuarantees,
  warmProdServe,
} from './utils/rsc-e2e.js'

setDefaultTimeout(60000)

describe('rsc e2e (vite build)', () => {
  const tpf = TestProjectOneClientFactory.create({
    namespace: 'rsc-vite-build',
    portsRange: [4175, 4199],
    vite: true,
  })
  let tp: TestProjectOneClient

  beforeAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
    tpf.setBrowser(await PlaywrightBrowser.init())
    tp = await bootRscProject(tpf, { spawn: 'none' })
    const bp = tp.spawn(['bun', 'run', 'build'])
    await bp.exited
    // Start + warm the prod server HERE, not inside `production flow`: a fresh prod boot (points load
    // eagerly) can eat most of a per-test budget on a loaded CI runner and tip it past 60s. In beforeAll
    // (240s) the boot is off the assertion budget — the test just drives the browser, the way the dev
    // files warm theirs.
    tp.spawn(['bun', 'run', 'start'])
    await tp.waitStarted((await tp.importEngine()).server.port)
    await warmProdServe(tp)
  }, 240000)

  afterAll(async () => {
    await tpf.cleanup({ files: true, processes: true, ports: true, browser: true })
  })

  it('strip guarantees: server code never in the client bundle, clientOnly render never in the server bundle', async () => {
    await expectRscStripGuarantees(tp)
  })

  it('a component point in its own file becomes its own chunk, listed in the preload manifest', async () => {
    await expectRscComponentChunkManifest(tp)
  })

  it('production flow: modulepreload for referenced islands, hydration clean, islands interactive', async () => {
    await expectRscProductionFlow(tp)
  })
})

import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type { Browser } from 'playwright'

/**
 * End-to-end tests for `create-point0-app`.
 *
 * Each test scaffolds a real app from the template (one Bun-bundled, one Vite-bundled), generates its artifacts and
 * asserts `tsc` passes on it, then runs `point0 dev` and opens the home page in a real (headless) Chromium via
 * Playwright to assert it renders.
 *
 * No `bun install` on purpose — same approach as the engine's dev tests. The scaffolded app lives inside the workspace
 * (`tests/temp/...`), so its `workspace:*` / `catalog:` deps resolve up the monorepo's hoisted `node_modules`. Skipping
 * install also avoids running native postinstall binaries (prisma engines, etc.) that some endpoint-security setups
 * flag.
 */

const packageRoot = resolve(import.meta.dir, '..')
const cliPath = resolve(packageRoot, 'src/index.ts')
const tempDir = resolve(packageRoot, 'tests/temp')

// Windows runs the whole scaffold→generate→prisma→typecheck→dev→browser sequence noticeably slower; give it headroom.
setDefaultTimeout(300_000)

// This E2E opens the scaffolded app's home page in a real Chromium. On Windows `chromium.launch()` can't run under Bun
// (pipe transport hangs / `uv_spawn` fails), so on win32 we spawn `chrome-headless-shell` + `connectOverCDP` instead
// (see launchBrowser and dev/docs/windows.md).
const isWin = process.platform === 'win32'

type Mode = { id: 'bun' | 'vite'; viteFlag: string; serverPort: number; clientPort: number }

// Distinct ports per mode; off 3000/3001 (local dev) and 3200-3299 (engine dev tests).
const MODES: Mode[] = [
  { id: 'bun', viteFlag: '--no-vite', serverPort: 3310, clientPort: 3311 },
  { id: 'vite', viteFlag: '--vite', serverPort: 3312, clientPort: 3313 },
]

type DevProcess = { proc: Bun.Subprocess; output: () => string }

function spawnDev(cwd: string): DevProcess {
  const chunks: Uint8Array[] = []
  // `process.execPath` (the running bun), not bare `bun`: on Windows a spawned child doesn't reliably inherit the
  // shell-profile bun dir on PATH. Same reasoning throughout this file.
  const proc = Bun.spawn([process.execPath, 'run', 'dev'], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env },
  })
  const collect = (stream: ReadableStream<Uint8Array> | number | undefined | null) => {
    if (stream && typeof stream !== 'number') {
      void stream.pipeTo(
        new WritableStream({
          write: (chunk) => {
            chunks.push(chunk)
          },
        }),
      )
    }
  }
  collect(proc.stdout)
  collect(proc.stderr)
  return { proc, output: () => new TextDecoder().decode(Buffer.concat(chunks)) }
}

async function waitForOutput(dev: DevProcess, needle: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (dev.output().includes(needle)) return
    await Bun.sleep(150)
  }
  throw new Error(`Timed out waiting for "${needle}".\n--- dev output ---\n${dev.output()}`)
}

async function getDescendantPids(rootPid: number): Promise<number[]> {
  const collected = new Set<number>()
  const queue = [rootPid]
  while (queue.length > 0) {
    const current = queue.shift()
    if (current === undefined) continue
    const result = await Bun.$`pgrep -P ${current}`.nothrow().quiet()
    if (result.exitCode !== 0) continue
    for (const child of result
      .text()
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)) {
      if (!collected.has(child)) {
        collected.add(child)
        queue.push(child)
      }
    }
  }
  return [...collected]
}

async function killTree(pid: number | undefined): Promise<void> {
  if (!pid) return
  if (isWin) {
    // Windows has no pgrep; `taskkill /T` kills the whole process tree (renderer/gpu/dev children) in one call.
    await Bun.$`taskkill /pid ${pid} /T /F`.nothrow().quiet()
    return
  }
  const pids = [...(await getDescendantPids(pid)), pid].reverse()
  for (const target of pids) {
    await Bun.$`kill -9 ${target}`.nothrow().quiet()
  }
}

async function killPorts(ports: number[]): Promise<void> {
  if (isWin) {
    // No lsof on Windows — read `netstat -ano`, match LISTENING rows on our ports, taskkill their owners.
    const result = await Bun.$`netstat -ano -p tcp`.nothrow().quiet()
    const pids = new Set<number>()
    for (const line of result.text().split('\n')) {
      if (!/LISTENING/i.test(line)) continue
      for (const port of ports) {
        if (new RegExp(`:${port}\\s`).test(line)) {
          const pid = Number(line.trim().split(/\s+/).pop())
          if (Number.isInteger(pid) && pid > 0) pids.add(pid)
        }
      }
    }
    for (const pid of pids) {
      await Bun.$`taskkill /pid ${pid} /T /F`.nothrow().quiet()
    }
    return
  }
  // Kill only the process LISTENING on each port (the dev server) — never a client connected to it.
  // `lsof -ti :PORT` also returns clients, and this very test process holds pooled keep-alive sockets to
  // the dev server from the step-4 `fetch` (which follows the redirect onto the client port too). Without
  // the LISTEN filter killPorts `kill -9`s itself — a silent SIGKILL (exit 137) with no test output, and
  // only on a slow runner where the socket is still pooled when cleanup runs. Excluding our own pid is a
  // belt-and-suspenders backstop.
  const result = await Bun.$`lsof -t -sTCP:LISTEN ${ports.flatMap((port) => ['-i', `tcp:${port}`])}`.nothrow().quiet()
  for (const pid of result
    .text()
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0 && value !== process.pid)) {
    await Bun.$`kill -9 ${pid}`.nothrow().quiet()
  }
}

// Open a real Chromium for the render assertion. On Windows `chromium.launch()` can't run under Bun (pipe transport
// hangs / `uv_spawn` fails), so spawn `chrome-headless-shell` with an auto-assigned debug port and `connectOverCDP`;
// everywhere else use the normal headless launch.
async function launchBrowser(): Promise<{ browser: Browser; shell?: Bun.Subprocess }> {
  const { chromium } = await import('playwright')
  if (!isWin) return { browser: await chromium.launch() }
  const shellPath = chromium
    .executablePath()
    .replace(
      /chromium-(\d+)([\\/])chrome-win64\2chrome\.exe$/,
      (_m, rev: string, sep: string) =>
        `chromium_headless_shell-${rev}${sep}chrome-headless-shell-win64${sep}chrome-headless-shell.exe`,
    )
  const userDataDir = join(tmpdir(), `cpa-cdp-${crypto.randomUUID()}`)
  const shell = Bun.spawn(
    [
      shellPath,
      '--headless',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
    ],
    { stdout: 'ignore', stderr: 'ignore' },
  )
  const portFile = join(userDataDir, 'DevToolsActivePort')
  let port: number | undefined
  for (let i = 0; i < 300; i++) {
    if (shell.exitCode !== null) {
      throw new Error(`chrome-headless-shell exited ${shell.exitCode} — run \`bunx playwright install chromium\``)
    }
    try {
      const first = (await readFile(portFile, 'utf8')).split('\n')[0]?.trim()
      if (first) {
        port = Number(first)
        break
      }
    } catch {
      /* port file not written yet */
    }
    await Bun.sleep(100)
  }
  if (!port) throw new Error('chrome-headless-shell did not report a CDP port')
  return { browser: await chromium.connectOverCDP(`http://127.0.0.1:${port}`), shell }
}

async function closeBrowser(browser: Browser, shell?: Bun.Subprocess): Promise<void> {
  try {
    await browser.close()
  } catch {}
  // connectOverCDP only disconnects — kill the shell process tree we spawned ourselves.
  if (shell?.pid) {
    Bun.spawnSync(['taskkill', '/pid', String(shell.pid), '/T', '/F'], { stdout: 'ignore', stderr: 'ignore' })
  }
}

async function writeAppEnv(appDir: string, mode: Mode): Promise<void> {
  await writeFile(
    resolve(appDir, '.env'),
    [
      `SERVER_PORT=${mode.serverPort}`,
      `CLIENT_PORT=${mode.clientPort}`,
      `SERVER_URL=http://localhost:${mode.serverPort}`,
      `CLIENT_URL=http://localhost:${mode.clientPort}`,
      'DATABASE_URL=file:./dev.db',
      'OPENAPI_CREDENTIALS=admin:admin',
      '',
    ].join('\n'),
  )
}

// `cmd[0]` should be the running bun (`process.execPath`) — callers pass it — so spawned children resolve bun on
// Windows without relying on PATH.
function run(cmd: string[], cwd: string, label: string): void {
  const result = Bun.spawnSync(cmd, { cwd, env: { ...process.env } })
  if (result.exitCode !== 0) {
    throw new Error(
      `${label} failed (exit ${result.exitCode}):\n${result.stdout.toString()}\n${result.stderr.toString()}`,
    )
  }
}

beforeAll(async () => {
  await rm(tempDir, { recursive: true, force: true })
  await mkdir(tempDir, { recursive: true })
})

describe('create-app e2e', () => {
  afterAll(async () => {
    await Promise.all(MODES.map((mode) => killPorts([mode.serverPort, mode.clientPort])))
    await rm(tempDir, { recursive: true, force: true })
  })

  for (const mode of MODES) {
    test(`creates a ${mode.id} app and serves the home page in a browser`, async () => {
      const appName = `${mode.id}-app`
      const appDir = resolve(tempDir, appName)
      const serverUrl = `http://localhost:${mode.serverPort}`

      let dev: DevProcess | undefined
      try {
        // 1. Scaffold from the template via the real CLI (no install — deps resolve up the workspace).
        const scaffold = Bun.spawnSync(
          [process.execPath, cliPath, appName, mode.viteFlag, '--no-install', '--no-interactive'],
          { cwd: tempDir, env: { ...process.env } },
        )
        if (scaffold.exitCode !== 0) {
          throw new Error(`scaffold failed:\n${scaffold.stdout.toString()}\n${scaffold.stderr.toString()}`)
        }

        // The bundler-specific patching ran: vite gets a vite.config.ts, bun does not.
        expect(await Bun.file(resolve(appDir, 'vite.config.ts')).exists()).toBe(mode.id === 'vite')
        // The engine carries the vite config inline for vite, and bun plugins for bun — never both.
        const engineSrc = await Bun.file(resolve(appDir, 'src/engine.ts')).text()
        expect(engineSrc.includes('viteConfig: ({ plugins })')).toBe(mode.id === 'vite')
        expect(engineSrc.includes('bunPlugins:')).toBe(mode.id === 'bun')
        // Both keep the new bootstrap from the template: the `index.server.ts` entry preloads the
        // compiler plugins (preload.ts) before serving (app.server.ts).
        expect(await Bun.file(resolve(appDir, 'bunfig.toml')).exists()).toBe(true)
        expect(await Bun.file(resolve(appDir, 'src/preload.ts')).exists()).toBe(true)
        expect(await Bun.file(resolve(appDir, 'src/index.server.ts')).exists()).toBe(true)

        await writeAppEnv(appDir, mode)

        // 2. Generate the point0 artifacts and the prisma client, then assert the scaffolded app type-checks cleanly.
        run([process.execPath, 'run', 'generate'], appDir, `point0 generate (${mode.id})`)
        run([process.execPath, 'run', 'prisma:generate'], appDir, `prisma generate (${mode.id})`)
        const typecheck = Bun.spawnSync([process.execPath, 'run', 'types'], { cwd: appDir, env: { ...process.env } })
        if (typecheck.exitCode !== 0) {
          throw new Error(
            `type check failed (${mode.id}):\n${typecheck.stdout.toString()}\n${typecheck.stderr.toString()}`,
          )
        }
        expect(typecheck.exitCode).toBe(0)

        // 3. Start the dev server (point0 dev regenerates on startup, then serves).
        await killPorts([mode.serverPort, mode.clientPort])
        dev = spawnDev(appDir)
        await waitForOutput(dev, `started http://localhost:${mode.clientPort}`, 30_000)
        await waitForOutput(dev, `started http://localhost:${mode.serverPort}`, 30_000)

        // 4. SSR check: the server URL 302-redirects to the client dev server, which renders the page.
        const html = await fetch(serverUrl, { redirect: 'follow' }).then((response) => response.text())
        expect(html).toContain('Welcome to My App')

        // 5. Open it in a real browser and assert the rendered page (CDP on Windows — see launchBrowser).
        const { browser, shell } = await launchBrowser()
        try {
          const page = await browser.newPage()
          await page.goto(serverUrl, { waitUntil: 'networkidle' })
          expect(await page.locator('body').textContent()).toContain('Welcome to My App!')
          expect(await page.title()).toBe('My App Forever!')
        } finally {
          await closeBrowser(browser, shell)
        }
      } finally {
        await killTree(dev?.proc.pid)
        await killPorts([mode.serverPort, mode.clientPort])
      }
    })
  }
})

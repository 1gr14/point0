import { describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs/promises'
import nodeOs from 'node:os'
import nodePath from 'node:path'
import { bunEnvCascadeFileNames } from '../src/env-files.js'

// applyEnvMode mutates process.env and its behavior depends on how the CLI process was started, so
// every scenario spawns a fresh bun child in a scenario-specific temp dir and calls applyEnvMode
// there via a runner script. The child's `env` IS its genuine OS environment block (Bun.spawnSync
// sets it verbatim), which is exactly what applyEnvMode restores process.env to on the legacy path.
// Two start styles mirror the two real entry paths:
//   clean  — `bun --no-env-file`: how the point0 bin starts on POSIX (Bun never auto-loads).
//   legacy — plain `bun`: shebang flag bypassed (Windows bin shim), so Bun pre-loads a cascade into
//            the JS process.env before the CLI runs; applyEnvMode restores the genuine OS env block.
const envFilesSrc = nodePath.resolve(import.meta.dir, '../src/env-files.ts')
const envOsSrc = nodePath.resolve(import.meta.dir, '../src/env-os.ts')

type ScenarioResult = {
  mode: string
  files: string[]
  cleanStart: boolean
  env: Record<string, string | undefined>
}

const runScenario = async ({
  files,
  childEnv = {},
  flagMode,
  envPairs,
  defaultMode,
  start,
}: {
  files: Record<string, string>
  childEnv?: Record<string, string>
  flagMode?: string
  envPairs?: string[]
  defaultMode: string
  start: 'clean' | 'legacy'
}): Promise<ScenarioResult> => {
  const scenarioDir = await nodeFs.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'point0-env-apply-'))
  // An empty bunfig outside the scenario dir keeps the app's bunfig (e.g. the [test] preload scenario)
  // from running in the clean-start runner. A real empty file, not /dev/null — which Bun rejects as a
  // config path on Windows.
  const configDir = await nodeFs.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'point0-env-cfg-'))
  const emptyConfig = nodePath.join(configDir, 'bunfig.toml')
  try {
    await nodeFs.writeFile(emptyConfig, '')
    for (const [name, content] of Object.entries(files)) {
      await nodeFs.writeFile(nodePath.join(scenarioDir, name), `${content}\n`)
    }
    const runner = nodePath.join(scenarioDir, 'runner.ts')
    await nodeFs.writeFile(
      runner,
      [
        `import { applyEnvMode } from ${JSON.stringify(envFilesSrc)}`,
        'const options = JSON.parse(process.argv[2] as string)',
        'const result = applyEnvMode({ cwd: process.cwd(), ...options })',
        'const names = Object.keys(process.env).filter((name) => name.startsWith("T_") || name === "NODE_ENV")',
        'const env = Object.fromEntries(names.map((name) => [name, process.env[name]]))',
        'console.log(JSON.stringify({ mode: result.mode, files: result.files, cleanStart: result.cleanStart, env }))',
      ].join('\n'),
    )
    const args = JSON.stringify({ flagMode, envPairs, defaultMode })
    const result = Bun.spawnSync({
      cmd:
        start === 'clean'
          ? [process.execPath, '--no-env-file', `--config=${emptyConfig}`, 'run', runner, args]
          : [process.execPath, 'run', runner, args],
      cwd: scenarioDir,
      env: childEnv,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (result.exitCode !== 0) {
      throw new Error(`runner failed: ${result.stderr.toString()}`)
    }
    return JSON.parse(result.stdout.toString()) as ScenarioResult
  } finally {
    await nodeFs.rm(scenarioDir, { recursive: true, force: true })
    await nodeFs.rm(configDir, { recursive: true, force: true })
  }
}

// start0-like layout: NODE_ENV=development sits INSIDE .env — the case that made `??= 'production'`
// in the old build command a no-op.
const start0LikeFiles = {
  '.env': 'NODE_ENV=development\nT_DB=devdb\nT_URL=http://localhost:3000',
  '.env.development': 'NODE_ENV=development\nT_ONLY_DEV=1',
  '.env.production': 'T_ONLY_PROD=1',
}

describe('applyEnvMode — clean start (the bin shebang path)', () => {
  it('build default: loads the production cascade, development files never load at all', async () => {
    const out = await runScenario({ files: start0LikeFiles, defaultMode: 'production', start: 'clean' })
    expect(out.cleanStart).toBe(true)
    expect(out.mode).toBe('production')
    expect(out.env.NODE_ENV).toBe('production')
    expect(out.env.T_ONLY_DEV).toBeUndefined()
    expect(out.env.T_ONLY_PROD).toBe('1')
    expect(out.env.T_DB).toBe('devdb') // .env is mode-independent and applies
    expect(out.files).toEqual(['.env', '.env.production'])
  })

  it('dev default: loads the development cascade', async () => {
    const out = await runScenario({ files: start0LikeFiles, defaultMode: 'development', start: 'clean' })
    expect(out.mode).toBe('development')
    expect(out.env.T_ONLY_DEV).toBe('1')
    expect(out.env.T_ONLY_PROD).toBeUndefined()
  })

  it('a shell-exported NODE_ENV is genuine and wins over the command default', async () => {
    const out = await runScenario({
      files: start0LikeFiles,
      childEnv: { NODE_ENV: 'development' },
      defaultMode: 'production',
      start: 'clean',
    })
    expect(out.mode).toBe('development')
    expect(out.env.T_ONLY_DEV).toBe('1')
  })

  it('flagMode wins over a shell-exported NODE_ENV', async () => {
    const out = await runScenario({
      files: start0LikeFiles,
      childEnv: { NODE_ENV: 'test' },
      flagMode: 'production',
      defaultMode: 'development',
      start: 'clean',
    })
    expect(out.mode).toBe('production')
    expect(out.env.T_ONLY_PROD).toBe('1')
  })

  it('shell-exported variables win over file values', async () => {
    const out = await runScenario({
      files: start0LikeFiles,
      childEnv: { T_DB: 'shelldb' },
      defaultMode: 'production',
      start: 'clean',
    })
    expect(out.env.T_DB).toBe('shelldb')
  })

  it('$REF expansion against shell variables works (bun is the parser)', async () => {
    const out = await runScenario({
      files: { '.env.production': 'T_EXP=$T_SHELL/api\nT_QUOTED="q $T_SHELL"\nT_DEFAULT=${T_MISSING:-fb}' },
      childEnv: { T_SHELL: 'http://x' },
      defaultMode: 'production',
      start: 'clean',
    })
    expect(out.env.T_EXP).toBe('http://x/api')
    expect(out.env.T_QUOTED).toBe('q http://x')
    expect(out.env.T_DEFAULT).toBe('fb')
  })

  it('--env pairs override files and a NODE_ENV pair drives the mode', async () => {
    const out = await runScenario({
      files: { ...start0LikeFiles, '.env.test': 'T_ONLY_TEST=1' },
      envPairs: ['T_DB=flagdb', 'NODE_ENV=test'],
      defaultMode: 'production',
      start: 'clean',
    })
    expect(out.mode).toBe('test')
    expect(out.env.T_DB).toBe('flagdb')
    expect(out.env.T_ONLY_TEST).toBe('1')
  })

  it("the app's bunfig (e.g. a [test] preload running app code) never runs in the probes", async () => {
    const out = await runScenario({
      files: {
        ...start0LikeFiles,
        'bunfig.toml': 'preload = ["./crash.ts"]',
        'crash.ts': 'throw new Error("app preload must not run in env probes")',
      },
      defaultMode: 'production',
      start: 'clean',
    })
    expect(out.mode).toBe('production')
    expect(out.env.T_ONLY_PROD).toBe('1')
  })

  it('throws on an invalid shell-exported NODE_ENV', async () => {
    await expect(
      runScenario({
        files: { '.env': 'T_DB=devdb' },
        childEnv: { NODE_ENV: 'staging' },
        defaultMode: 'production',
        start: 'clean',
      }),
    ).rejects.toThrow('Invalid NODE_ENV')
  })

  it('no env files → no probe, just the resolved mode', async () => {
    const out = await runScenario({ files: {}, defaultMode: 'production', start: 'clean' })
    expect(out.mode).toBe('production')
    expect(out.files).toEqual([])
    expect(Object.keys(out.env)).toEqual(['NODE_ENV'])
  })
})

describe('applyEnvMode — legacy start (shebang bypassed, Bun pre-loaded a cascade)', () => {
  it('build default: discards the pre-loaded development cascade, even with NODE_ENV=development inside .env', async () => {
    const out = await runScenario({ files: start0LikeFiles, defaultMode: 'production', start: 'legacy' })
    expect(out.cleanStart).toBe(false)
    expect(out.mode).toBe('production')
    expect(out.env.NODE_ENV).toBe('production')
    expect(out.env.T_ONLY_DEV).toBeUndefined()
    expect(out.env.T_ONLY_PROD).toBe('1')
    expect(out.env.T_DB).toBe('devdb')
  })

  it('cross-env NODE_ENV=production startup stays intact', async () => {
    const out = await runScenario({
      files: start0LikeFiles,
      childEnv: { NODE_ENV: 'production' },
      defaultMode: 'production',
      start: 'legacy',
    })
    expect(out.mode).toBe('production')
    expect(out.env.T_ONLY_DEV).toBeUndefined()
    expect(out.env.T_ONLY_PROD).toBe('1')
  })

  it('genuinely shell-exported NODE_ENV (absent from files) wins over the command default', async () => {
    const out = await runScenario({
      files: { '.env': 'T_DB=devdb', '.env.test': 'T_ONLY_TEST=1' },
      childEnv: { NODE_ENV: 'test' },
      defaultMode: 'production',
      start: 'legacy',
    })
    expect(out.mode).toBe('test')
    expect(out.env.T_ONLY_TEST).toBe('1')
  })

  it('keeps shell-exported variables whose value differs from the file value', async () => {
    const out = await runScenario({
      files: start0LikeFiles,
      childEnv: { T_DB: 'shelldb' },
      defaultMode: 'production',
      start: 'legacy',
    })
    expect(out.env.T_DB).toBe('shelldb')
  })

  it('dev default keeps the development cascade', async () => {
    const out = await runScenario({ files: start0LikeFiles, defaultMode: 'development', start: 'legacy' })
    expect(out.mode).toBe('development')
    expect(out.env.T_ONLY_DEV).toBe('1')
    expect(out.env.T_ONLY_PROD).toBeUndefined()
  })
})

// The make-or-break invariant of the legacy path: Bun's .env auto-load mutates ONLY the JS process.env
// — it never writes the process's native OS environment block (no setenv). readOsEnviron() reads that
// native block, so it must come back free of any .env value. This canary spawns a plain bun (which DOES
// auto-load .env) in a dir that has one, and asserts the native read stayed pristine. If a future Bun
// ever starts seeding the native block from .env, the whole approach silently breaks (a production build
// would keep development-only vars) — this test turns red first.
describe('the invariant the legacy path stands on — Bun never pollutes the native OS env', () => {
  it('readOsEnviron() carries no .env value even when Bun auto-loaded one into process.env', async () => {
    const dir = await nodeFs.mkdtemp(nodePath.join(nodeOs.tmpdir(), 'point0-env-canary-'))
    try {
      await nodeFs.writeFile(nodePath.join(dir, '.env'), 'T_CANARY=leaked_from_dotenv\n')
      const runner = nodePath.join(dir, 'canary.ts')
      await nodeFs.writeFile(
        runner,
        [
          `import { readOsEnviron } from ${JSON.stringify(envOsSrc)}`,
          'const native = readOsEnviron()',
          'console.log(JSON.stringify({',
          '  jsLoadedIt: process.env.T_CANARY === "leaked_from_dotenv",',
          '  nativeLeaked: native?.T_CANARY !== undefined,',
          '  nativeGenuine: native?.T_GENUINE,',
          '  nativeKeys: Object.keys(native ?? {}).length,',
          '}))',
        ].join('\n'),
      )
      // Plain bun (no --no-env-file): Bun auto-loads .env into the JS process.env. The child's genuine OS
      // environ is exactly what we pass — T_GENUINE present, T_CANARY absent.
      const result = Bun.spawnSync({
        cmd: [process.execPath, 'run', runner],
        cwd: dir,
        env: { PATH: process.env.PATH ?? '', T_GENUINE: 'real' },
        stdout: 'pipe',
        stderr: 'pipe',
      })
      if (result.exitCode !== 0) {
        throw new Error(`canary runner failed: ${result.stderr.toString()}`)
      }
      const out = JSON.parse(result.stdout.toString()) as {
        jsLoadedIt: boolean
        nativeLeaked: boolean
        nativeGenuine: string | undefined
        nativeKeys: number
      }
      expect(out.jsLoadedIt).toBe(true) // sanity: Bun really did auto-load .env, so the test has teeth
      expect(out.nativeLeaked).toBe(false) // THE invariant: the native block holds no .env value
      expect(out.nativeGenuine).toBe('real') // a genuine shell var does come through the native read
      expect(out.nativeKeys).toBeGreaterThan(0) // FFI read returned a populated env, not a failed fallback
    } finally {
      await nodeFs.rm(dir, { recursive: true, force: true })
    }
  })
})

// Everything a human puts in the environment BEFORE point0 runs — an inline `VAR=x point0 …` prefix,
// cross-env, or dotenv-cli loading an out-of-cascade file — lands in the process's genuine OS environ.
// That is exactly what `childEnv` models here (Bun.spawnSync sets the child's native block to it; the
// canary above proves readOsEnviron reads it faithfully). The fix only ever suppresses Bun's OWN .env
// auto-load — it must never drop a genuinely-provided var. These cover the three invocation shapes,
// across the start mode(s) that carry signal. T_MY stands in for a user var like MY_ENV.
describe('human-provided env always reaches through (we only suppress Bun’s own .env auto-load)', () => {
  for (const start of ['clean', 'legacy'] as const) {
    it(`inline \`T_MY=A NODE_ENV=test point0 dev\` — the var reaches and NODE_ENV drives the mode (${start})`, async () => {
      const out = await runScenario({
        files: { '.env': 'T_DB=devdb', '.env.test': 'T_ONLY_TEST=1' },
        childEnv: { T_MY: 'A', NODE_ENV: 'test' },
        defaultMode: 'development', // `point0 dev`
        start,
      })
      expect(out.mode).toBe('test')
      expect(out.env.NODE_ENV).toBe('test')
      expect(out.env.T_MY).toBe('A') // the human's var survived the restore
      expect(out.env.T_ONLY_TEST).toBe('1') // the resolved-mode cascade still layers on top
      expect(out.env.T_DB).toBe('devdb') // the mode-independent .env still applies
    })
  }

  it('`cross-env T_MY=A NODE_ENV=test point0 dev` — identical: cross-env just exports genuine vars', async () => {
    // cross-env reads the leading VAR=VALUE pairs, sets them in its own env, then execs point0; from
    // point0's side they are indistinguishable from a shell export — the same genuine OS environ.
    const out = await runScenario({
      files: { '.env': 'T_DB=devdb', '.env.test': 'T_ONLY_TEST=1' },
      childEnv: { T_MY: 'A', NODE_ENV: 'test' },
      defaultMode: 'development',
      start: 'legacy',
    })
    expect(out.mode).toBe('test')
    expect(out.env.T_MY).toBe('A')
    expect(out.env.T_ONLY_TEST).toBe('1')
  })

  it('`dotenv -e .env.special -- point0 dev` — an injected out-of-cascade file wins over the .env cascade', async () => {
    // dotenv-cli loads .env.special into the process env, THEN runs point0. Those values are genuine OS
    // env (not part of Bun's .env/.env.<mode> cascade), so they must survive the restore AND, where they
    // collide with a cascade file, win like any shell export. Here .env.special carried T_DB + NODE_ENV.
    const out = await runScenario({
      files: { '.env': 'T_DB=devdb', '.env.test': 'T_ONLY_TEST=1\nT_DB=testdb' },
      childEnv: { T_DB: 'specialdb', NODE_ENV: 'test' }, // what dotenv-cli injected from .env.special
      defaultMode: 'development',
      start: 'legacy',
    })
    expect(out.mode).toBe('test') // NODE_ENV from .env.special drives the cascade selection
    expect(out.env.T_ONLY_TEST).toBe('1') // .env.test still loads
    expect(out.env.T_DB).toBe('specialdb') // injected value beats BOTH .env (devdb) and .env.test (testdb)
  })

  it('an invalid NODE_ENV from the environment is rejected, not coerced (e.g. uppercase `TEST`)', async () => {
    // The modes are the lowercase trio; an uppercase `TEST` is not one of them. We reject loudly rather
    // than guess what the user meant.
    await expect(
      runScenario({
        files: { '.env': 'T_DB=devdb' },
        childEnv: { NODE_ENV: 'TEST' },
        defaultMode: 'development',
        start: 'legacy',
      }),
    ).rejects.toThrow('Invalid NODE_ENV')
  })
})

describe('bunEnvCascadeFileNames', () => {
  it('mirrors Bun file sets per mode', () => {
    expect(bunEnvCascadeFileNames('development')).toEqual([
      '.env',
      '.env.development',
      '.env.local',
      '.env.development.local',
    ])
    expect(bunEnvCascadeFileNames('production')).toEqual([
      '.env',
      '.env.production',
      '.env.local',
      '.env.production.local',
    ])
    expect(bunEnvCascadeFileNames('test')).toEqual(['.env', '.env.test', '.env.test.local'])
  })
})

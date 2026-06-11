import { describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs/promises'
import nodeOs from 'node:os'
import nodePath from 'node:path'
import { bunEnvCascadeFileNames } from '../src/env-files.js'

// applyEnvMode mutates process.env and its behavior depends on how the CLI process was started, so
// every scenario spawns a fresh bun child in a scenario-specific temp dir and calls applyEnvMode
// there via a runner script. Two start styles mirror the two real entry paths:
//   clean  — `bun --no-env-file --config=/dev/null`: how the point0 bin starts (the cli.ts shebang).
//   legacy — plain `bun`: shebang bypassed, Bun pre-loads a cascade before the CLI code runs.
const envFilesSrc = nodePath.resolve(import.meta.dir, '../src/env-files.ts')

type ScenarioResult = {
  mode: string
  files: string[]
  unloadedFiles: string[]
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
  try {
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
        'console.log(JSON.stringify({ mode: result.mode, files: result.files, unloadedFiles: result.unloadedFiles, cleanStart: result.cleanStart, env }))',
      ].join('\n'),
    )
    const args = JSON.stringify({ flagMode, envPairs, defaultMode })
    const result = Bun.spawnSync({
      cmd:
        start === 'clean'
          ? [process.execPath, '--no-env-file', '--config=/dev/null', 'run', runner, args]
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
    expect(out.unloadedFiles).toEqual([])
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
  it('build default: unloads the pre-loaded development cascade, even with NODE_ENV=development inside .env', async () => {
    const out = await runScenario({ files: start0LikeFiles, defaultMode: 'production', start: 'legacy' })
    expect(out.cleanStart).toBe(false)
    expect(out.mode).toBe('production')
    expect(out.env.NODE_ENV).toBe('production')
    expect(out.env.T_ONLY_DEV).toBeUndefined()
    expect(out.env.T_ONLY_PROD).toBe('1')
    expect(out.env.T_DB).toBe('devdb')
    expect(out.unloadedFiles).toEqual(['.env.development'])
  })

  it('cross-env NODE_ENV=production startup needs no repair and stays intact', async () => {
    const out = await runScenario({
      files: start0LikeFiles,
      childEnv: { NODE_ENV: 'production' },
      defaultMode: 'production',
      start: 'legacy',
    })
    expect(out.mode).toBe('production')
    expect(out.env.T_ONLY_DEV).toBeUndefined()
    expect(out.env.T_ONLY_PROD).toBe('1')
    expect(out.unloadedFiles).toEqual([])
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

  it('dev default keeps the development cascade untouched', async () => {
    const out = await runScenario({ files: start0LikeFiles, defaultMode: 'development', start: 'legacy' })
    expect(out.mode).toBe('development')
    expect(out.env.T_ONLY_DEV).toBe('1')
    expect(out.env.T_ONLY_PROD).toBeUndefined()
    expect(out.unloadedFiles).toEqual([])
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

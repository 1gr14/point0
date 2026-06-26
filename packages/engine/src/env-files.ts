import type { NormalizedNodeEnv } from '@point0/core'
import nodeFs from 'node:fs'
import nodeOs from 'node:os'
import nodePath from 'node:path'
import { readOsEnviron } from './env-os.js'

// Bun auto-loads a .env cascade BEFORE any CLI code runs, picking the file set from the startup
// NODE_ENV alone (unset → development → .env.development). We don't want Bun choosing for us — each
// command resolves its OWN target mode from flags and we load that mode's cascade ourselves, into
// process.env, before the user's engine file is imported (it reads process.env at module scope).
//
// Keeping Bun from auto-loading needs the `--no-env-file` flag on the process up front. The cli.ts
// shebang sets it on POSIX, but a Windows bin shim can't carry the flag — so there Bun DOES
// auto-load. Crucially, Bun mutates only the JS `process.env`; the process's native OS environment
// block stays pristine (no .env values). So on that path we simply restore process.env to the
// genuine block via readOsEnviron() — no diffing, no "unloading", nothing to subtract — and then
// proceed identically to the hermetic path. See env-os.ts.
//
// No hand-rolled dotenv parser: Bun itself is the only fully faithful parser of its own .env loading
// (quotes, $REF expansion, shell-wins precedence, the mode cascade), so the target cascade is read
// by spawning a short-lived bun child in the app directory and diffing what it auto-loaded on top of
// the genuine environment.

export type EnvFileMode = NormalizedNodeEnv

const validModes: NormalizedNodeEnv[] = ['production', 'development', 'test']

/**
 * Hidden env var where applyEnvMode stores its one-line summary of the env-mode decision. The CLI has no configured
 * logger at env-resolution time (the user engine isn't even imported yet), so the engine logs it later at debug level,
 * once the app logger is applied (Engine._logEnvModeDebug), and consumes the var so children don't repeat it.
 */
export const POINT0_ENV_MODE_LOG = 'POINT0_ENV_MODE_LOG'

/** The file-cascade mode Bun derives from a NODE_ENV value: anything but production/test is development. */
export const bunEnvFileModeFor = (nodeEnv: string | undefined): EnvFileMode =>
  nodeEnv === 'production' || nodeEnv === 'test' ? nodeEnv : 'development'

/**
 * The files Bun auto-loads for a mode, in load order (later files override earlier ones). Bun skips .env.local in test
 * mode.
 */
export const bunEnvCascadeFileNames = (mode: EnvFileMode): string[] => [
  '.env',
  `.env.${mode}`,
  ...(mode === 'test' ? [] : ['.env.local']),
  `.env.${mode}.local`,
]

const existingCascadeFiles = ({ cwd, mode }: { cwd: string; mode: EnvFileMode }): string[] =>
  bunEnvCascadeFileNames(mode).filter((fileName) => nodeFs.existsSync(nodePath.join(cwd, fileName)))

/**
 * Spawns a bun child in `cwd` with exactly `env` as its environment and returns what its auto-load added on top — i.e.
 * the values the .env cascade contributes for that environment. Keys present in `env` keep their value in the child
 * (shell wins over files in Bun), so they never show up here. An empty temp bunfig is passed so the app's bunfig (e.g.
 * a `[test]` preload) never runs here.
 */
const probeBunEnvFiles = ({ cwd, env }: { cwd: string; env: Record<string, string> }): Map<string, string> => {
  const tmpDir = nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), 'point0-env-probe-'))
  const emptyConfig = nodePath.join(tmpDir, 'bunfig.toml')
  try {
    nodeFs.writeFileSync(emptyConfig, '')
    const result = Bun.spawnSync({
      // --config must be the equals form: with a space bun treats the value as the script to run.
      cmd: [process.execPath, `--config=${emptyConfig}`, '-e', 'process.stdout.write(JSON.stringify(process.env))'],
      cwd,
      env,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    if (result.exitCode !== 0) {
      throw new Error(`point0: failed to read .env files via a bun child: ${result.stderr.toString()}`)
    }
    const childEnv = JSON.parse(result.stdout.toString()) as Record<string, string>
    const loaded = new Map<string, string>()
    for (const [name, value] of Object.entries(childEnv)) {
      if (env[name] !== value) {
        loaded.set(name, value)
      }
    }
    return loaded
  } finally {
    nodeFs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

/**
 * Restore process.env to the genuine shell environment when Bun auto-loaded a .env cascade at startup (the non-hermetic
 * path — a Windows bin shim can't pass `--no-env-file`). Bun's auto-load only ever ADDS to the JS process.env, leaving
 * the native OS block untouched, so the genuine environment is exactly readOsEnviron(): clear process.env and reinstate
 * it. No diffing, no mode-guessing, no risk of dropping a real shell export. Returns false when the platform's native
 * block can't be read, so the caller can fall back to Bun's process.env as-is (best effort).
 */
const restoreGenuineEnv = (): boolean => {
  const genuine = readOsEnviron()
  if (!genuine) {
    return false
  }
  for (const key of Object.keys(process.env)) {
    delete process.env[key]
  }
  Object.assign(process.env, genuine)
  return true
}

export type ApplyEnvModeOptions = {
  cwd: string
  /** Mode forced by CLI flags (--mode / -p / -d / -t). Wins over everything. */
  flagMode?: NormalizedNodeEnv | undefined
  /**
   * Raw `NAME=value` strings from --env. Applied last, overriding file values; a NODE_ENV pair also feeds mode
   * resolution.
   */
  envPairs?: string[] | undefined
  /** The command's mode when nothing else decides: production for build, development for everything else. */
  defaultMode: NormalizedNodeEnv
}

export type ApplyEnvModeResult = {
  mode: NormalizedNodeEnv
  /** Env files now in effect, in load order. */
  files: string[]
  /**
   * True when Bun was hermetic at startup (`--no-env-file` took effect, e.g. the POSIX shebang) so process.env was
   * already the genuine shell environment. False when Bun had auto-loaded a cascade and process.env was restored from
   * the native OS block first.
   */
  cleanStart: boolean
}

const asValidMode = (value: string, source: string): NormalizedNodeEnv => {
  if (!validModes.includes(value as NormalizedNodeEnv)) {
    throw new Error(`Invalid NODE_ENV from ${source}: ${value}. Allowed values: ${validModes.join(', ')}`)
  }
  return value as NormalizedNodeEnv
}

/**
 * Decides the target NODE_ENV mode and makes process.env hold exactly the right-mode env-file cascade on top of the
 * genuine shell environment (shell always wins over files, like in Bun). Mode precedence: flagMode > --env NODE_ENV >
 * shell-exported NODE_ENV > defaultMode.
 */
export const applyEnvMode = ({
  cwd,
  flagMode,
  envPairs = [],
  defaultMode,
}: ApplyEnvModeOptions): ApplyEnvModeResult => {
  const pairs = envPairs.map((pair) => {
    const [name, ...valueParts] = pair.split('=')
    return { name: name as string, value: valueParts.join('=') }
  })
  let pairsNodeEnv: string | undefined
  for (const pair of pairs) {
    if (pair.name === 'NODE_ENV') {
      pairsNodeEnv = pair.value
    }
  }

  // Hermetic start: Bun honored `--no-env-file`, so process.env is already the genuine shell
  // environment with no .env values. Otherwise Bun auto-loaded a cascade into the JS process.env;
  // restore process.env to the genuine OS environment block, discarding that injection wholesale.
  const cleanStart = process.execArgv.includes('--no-env-file')
  if (!cleanStart) {
    restoreGenuineEnv()
  }

  // From here process.env holds only the genuine shell environment.
  const mode =
    flagMode ??
    (pairsNodeEnv !== undefined ? asValidMode(pairsNodeEnv, '--env NODE_ENV') : undefined) ??
    (process.env.NODE_ENV !== undefined ? asValidMode(process.env.NODE_ENV, 'process.env.NODE_ENV') : undefined) ??
    defaultMode

  const fileMode = bunEnvFileModeFor(mode)
  const files = existingCascadeFiles({ cwd, mode: fileMode })
  if (files.length > 0) {
    const env: Record<string, string> = {}
    for (const [name, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[name] = value
      }
    }
    env.NODE_ENV = fileMode
    const loaded = probeBunEnvFiles({ cwd, env })
    for (const [name, value] of loaded) {
      if (process.env[name] === undefined) {
        process.env[name] = value
      }
    }
  }
  for (const { name, value } of pairs) {
    process.env[name] = value
  }
  process.env.NODE_ENV = mode

  const filesPart = files.length > 0 ? ` · env files: ${files.join(', ')}` : ''
  process.env[POINT0_ENV_MODE_LOG] = `NODE_ENV=${mode}${filesPart}`
  return { mode, files, cleanStart }
}

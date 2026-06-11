import type { NormalizedNodeEnv } from '@point0/core'
import nodeFs from 'node:fs'
import nodeOs from 'node:os'
import nodePath from 'node:path'

// Bun auto-loads .env files BEFORE any CLI code runs, picking the file set from NODE_ENV alone —
// with NODE_ENV unset it assumes development and loads .env.development, and a NODE_ENV=development
// line inside .env makes a later `??= 'production'` a no-op entirely. So the CLI starts Bun with
// `--no-env-file --config=/dev/null` (see the cli.ts shebang): the process begins with the genuine
// shell environment only and stays independent from the app's bunfig. Each command then resolves
// its target mode from flags and calls applyEnvMode below, which loads the right-mode cascade into
// process.env BEFORE the user's engine file is imported (it reads process.env at module scope).
//
// No hand-rolled dotenv parser: Bun itself is the only fully faithful parser of its own .env
// loading (quotes, $REF expansion, shell-wins precedence, the mode cascade), so the cascade is read
// by spawning a short-lived bun child in the app directory and diffing what it auto-loaded.

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
 * Legacy path — the CLI was started WITHOUT the shebang flags (Windows shims skip shebangs; `bun .../cli.js` directly),
 * so Bun already auto-loaded a cascade picked from the startup NODE_ENV. Undo it: re-read those files through a bun
 * child and drop every process.env entry whose value matches the file value, NODE_ENV included when it merely echoes
 * the files (a NODE_ENV=development line inside .env must not pick the mode — otherwise `point0 build` could never
 * default to production). Returns the file names that had been auto-loaded.
 *
 * Two caveats the heuristic can't avoid (both absent on the clean shebang path): a genuinely exported shell variable
 * that happens to equal the file value is dropped too (harmless — the target cascade or the shell re-supplies it), and
 * a file value whose $REF expansion used shell variables may not match the probe and then conservatively survives.
 */
const repairStartupEnv = ({ cwd }: { cwd: string }): string[] => {
  const startupFileMode = bunEnvFileModeFor(process.env.NODE_ENV)
  // An env file can itself set NODE_ENV — then the current value lies about which cascade Bun used
  // at startup (it defaulted to development), so always also repair the development cascade.
  const candidateModes: EnvFileMode[] =
    startupFileMode === 'development' ? ['development'] : [startupFileMode, 'development']
  const startupFiles: string[] = []
  let nodeEnvIsFromFiles = false
  for (const mode of candidateModes) {
    const files = existingCascadeFiles({ cwd, mode })
    if (files.length === 0) {
      continue
    }
    if (mode === startupFileMode) {
      startupFiles.push(...files)
    }
    // For the development candidate an empty environ also reveals a file-set NODE_ENV; for
    // production/test the probe must pin NODE_ENV so the child loads that cascade.
    const fileValues = probeBunEnvFiles({ cwd, env: mode === 'development' ? {} : { NODE_ENV: mode } })
    for (const [name, value] of fileValues) {
      if (name === 'NODE_ENV') {
        nodeEnvIsFromFiles ||= process.env.NODE_ENV === value
        continue
      }
      if (process.env[name] === value) {
        delete process.env[name]
      }
    }
  }
  if (nodeEnvIsFromFiles) {
    delete process.env.NODE_ENV
  }
  return startupFiles
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
  /** Legacy path only: files Bun had auto-loaded at startup that are not part of the target cascade. */
  unloadedFiles: string[]
  /** True when the CLI ran under --no-env-file (the bin shebang) — no startup pollution ever existed. */
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

  const cleanStart = process.execArgv.includes('--no-env-file')
  let startupFiles: string[] = []
  if (!cleanStart) {
    startupFiles = repairStartupEnv({ cwd })
  }

  // From here process.env holds (to the legacy-path caveats above) only genuine shell exports.
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

  const unloadedFiles = startupFiles.filter((fileName) => !files.includes(fileName))
  const filesPart = files.length > 0 ? ` · env files: ${files.join(', ')}` : ''
  const unloadedPart = unloadedFiles.length > 0 ? ` · unloaded: ${unloadedFiles.join(', ')}` : ''
  process.env[POINT0_ENV_MODE_LOG] = `NODE_ENV=${mode}${filesPart}${unloadedPart}`
  return { mode, files, unloadedFiles, cleanStart }
}

#!/usr/bin/env bun
/**
 * ci-decide — the single, auditable home for "what should this CI run do?". Given the GitHub event context + the
 * tip/release commit message, it decides which OSes to test on and whether to publish, and prints the result as
 * GITHUB_OUTPUT lines (`oses`, `slow`, `publish`) consumed by ci.yml / release.yml. Keeping the policy here (not spread
 * across brittle `if:` expressions) makes the safety invariants testable — see scripts/ci-decide.test.ts.
 *
 * Branch model is classic OSS: one `main` trunk, releases driven by `v*` tags.
 *
 *     pull_request → main      full matrix, no publish        (the merge gate)
 *       …docs-only diff        empty matrix, no publish        (every changed file is *.md)
 *     push tag v* stable       full matrix (MANDATORY), publish→latest
 *     push tag v* prerelease   full unless --skip-tests[=os], publish→next
 *     push        feature      tests only if --run-tests[=os], never publish
 *     any         --skip-ci    nothing (ignored on a stable tag)
 *
 * Note: ci.yml does NOT gate pushes to `main` (the PR is the gate; main only changes via an already-tested PR or a
 * release commit, and the release commit is gated by its tag). So a push to `main` isn't normally fed here; the
 * defensive `main → full` below only covers a manual dispatch.
 *
 * Invariants (pinned by tests):
 *
 * 1. A stable tag always tests — no flag can skip it.
 * 2. `publish` is true only for tags — structurally unreachable from PRs, forks, branch pushes.
 * 3. The gate stays green-or-skipped before publish (enforced by the workflow `if:`, not here).
 *
 * Commit-message flags (dash style, matching the existing --skip-ci): --skip-tests, --run-tests, each optionally
 * `=os,os` (linux/ubuntu, windows/win, macos/mac); bare = all OSes.
 */
import { SLOW_TESTS } from './slow-tests.js'
import { buildFastGroupsFromDisk } from './test-plan.js'

/** The default test matrix. macOS is intentionally out (×10 minutes, POSIX-identical to Linux). */
export const FULL_OSES = ['ubuntu-latest', 'windows-latest'] as const

/** The trunk branch in the classic single-branch model. */
export const MAIN_BRANCH = 'main'

/**
 * Whether a PR is docs-only — EVERY changed file is Markdown (`*.md`). Deliberately the narrowest safe rule: only `.md`
 * can ever skip the matrix, so no executable or config file can slip into a skip — not even one living under `dev/` or
 * `docs/` (e.g. `dev/scripts/foo.ts`, `docs/categories.json`). Anything else in the diff — code, `.json`, `.yml`,
 * `.mdx` points, images, `LICENSE` — forces the full gate. Empty change set ⇒ false, so we never skip blind.
 */
export const isDocsOnly = (files: readonly string[]): boolean =>
  files.length > 0 && files.every((file) => file.endsWith('.md'))

const OS_ALIASES: Record<string, string> = {
  linux: 'ubuntu-latest',
  ubuntu: 'ubuntu-latest',
  'ubuntu-latest': 'ubuntu-latest',
  windows: 'windows-latest',
  win: 'windows-latest',
  'windows-latest': 'windows-latest',
  macos: 'macos-latest',
  mac: 'macos-latest',
  osx: 'macos-latest',
  'macos-latest': 'macos-latest',
}

/** Map a comma list of OS aliases to runner labels (deduped, unknowns dropped, order preserved). */
const resolveOses = (csv: string): string[] => {
  const out: string[] = []
  for (const raw of csv.split(',')) {
    const label = OS_ALIASES[raw.trim().toLowerCase()]
    if (label && !out.includes(label)) out.push(label)
  }
  return out
}

/** Parse `--<name>` / `--<name>=os,os` from a commit message. */
const parseFlag = (message: string, name: string): { present: boolean; oses?: string[] } => {
  const m = new RegExp(`--${name}(?:=(?<os>[a-z0-9,\\-]+))?`, 'i').exec(message)
  if (!m) return { present: false }
  // A named group so the optional `=os,os` capture is honestly typed `string | undefined` (indexing
  // `m[1]` would be typed `string`, which isn't true here — the group may not match).
  const csv = m.groups?.os
  return { present: true, oses: csv === undefined ? undefined : resolveOses(csv) }
}

const hasSkipCi = (message: string): boolean => /--skip-ci\b/i.test(message)

export type DecideInput = {
  /** GITHUB_EVENT_NAME: 'pull_request' | 'push' | 'workflow_dispatch' | … */
  event: string
  /** GITHUB_REF_TYPE: 'branch' | 'tag'. */
  refType: string
  /** GITHUB_REF_NAME: the branch name, or the tag name on a tag push. */
  ref: string
  /** The relevant commit message (tip commit on a push/PR, release commit on a tag). */
  message: string
  /**
   * Files changed by a PR (relative repo paths), used only on `pull_request` to detect a docs-only diff.
   * Empty/undefined ⇒ treated as "unknown", so the gate runs the full matrix (never skips blind).
   */
  changedFiles?: string[]
}

export type DecideResult = { oses: string[]; slow: string[]; publish: boolean }

const withoutOses = (oses: readonly string[], drop: string[]): string[] => oses.filter((os) => !drop.includes(os))

/** Pure policy. See the module header for the truth table. */
export function decide({ event, refType, ref, message, changedFiles }: DecideInput): DecideResult {
  const slow = [...SLOW_TESTS]
  const full = [...FULL_OSES]
  const msg = message

  // RELEASE — a tag is the only thing that publishes (invariant 2).
  if (refType === 'tag') {
    const prerelease = ref.includes('-')
    let oses: string[]
    if (!prerelease) {
      oses = full // stable: always test, flags ignored (invariant 1)
    } else {
      const skip = parseFlag(msg, 'skip-tests')
      oses = skip.present ? (skip.oses ? withoutOses(full, skip.oses) : []) : full
    }
    return { oses, slow, publish: true }
  }

  // --skip-ci short-circuits any non-tag run.
  if (hasSkipCi(msg)) return { oses: [], slow, publish: false }

  // GATE — never publishes (invariant 2).
  if (event === 'pull_request') {
    // A PR that touches only prose has nothing to build or test → skip the matrix. The `gate` job in
    // ci.yml stays green on the skip, so the required check still reports (a bare skip would hang the PR).
    if (isDocsOnly(changedFiles ?? [])) return { oses: [], slow, publish: false }
    return { oses: full, slow, publish: false }
  }
  if (ref === MAIN_BRANCH) return { oses: full, slow, publish: false } // push to trunk

  // Any other branch: tests are opt-in via --run-tests (all, or a specific OS).
  const run = parseFlag(msg, 'run-tests')
  if (run.present) return { oses: run.oses ?? full, slow, publish: false }
  return { oses: [], slow, publish: false }
}

if (import.meta.main) {
  // Tag pushes don't populate github.event.head_commit, so fall back to the tagged commit's message.
  const messageFromGit = () => Bun.spawnSync(['git', 'log', '-1', '--pretty=%B']).stdout.toString().trim()

  // CHANGED_FILES is a newline-separated list the workflow computes (git diff base...head) on PRs only.
  const changedFiles = (process.env.CHANGED_FILES ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const result = decide({
    event: process.env.GITHUB_EVENT_NAME ?? 'push',
    refType: process.env.GITHUB_REF_TYPE ?? 'branch',
    ref: process.env.GITHUB_REF_NAME ?? '',
    message: process.env.COMMIT_MESSAGE || messageFromGit(),
    changedFiles,
  })

  // The fast lane's runner groups (pinned + auto rest-N) — the `test-fast` matrix fans one runner per id,
  // so it self-sizes from scripts/test-plan.ts. Globs the checked-out tree; slow files never appear here.
  const fastGroups = await buildFastGroupsFromDisk()

  const lines = [
    `oses=${JSON.stringify(result.oses)}`,
    `slow=${JSON.stringify(result.slow)}`,
    `fast=${JSON.stringify(fastGroups.map((group) => group.id))}`,
    `publish=${result.publish}`,
  ]
  for (const line of lines) console.info(line)

  // Human-readable plan → stderr, so it lands in the `decide` job log WITHOUT polluting GITHUB_OUTPUT
  // (stdout is redirected there). Surfaces which files each rest group carries — a newly-added file shows
  // up here instead of silently unbalancing a shard.
  for (const group of fastGroups) {
    console.error(`[test-plan] fast group "${group.id}" (${group.files.length}): ${group.files.join(', ')}`)
  }
}

#!/usr/bin/env bun
/**
 * ci-decide — the single, auditable home for "what should this CI run do?". Given the GitHub event context + the
 * tip/release commit message, it decides which OSes to test on and whether to publish, and prints the result as
 * GITHUB_OUTPUT lines (`oses`, `groups`, `solo`, `publish`) consumed by ci.yml / release.yml. Keeping the policy here
 * (not spread across brittle `if:` expressions) makes the safety invariants testable — see ci-decide.unit.test.ts.
 *
 * The policy decides WHAT runs (OS matrix, publish); HOW the test files are distributed across runners is the test
 * plan's job (scripts/test.ts, `--plan`) — this script just forwards the plan to the workflows.
 *
 * Branch model is classic OSS: one `main` trunk, releases driven by `v*` tags.
 *
 *     pull_request → main      full matrix, no publish        (the merge gate)
 *       …docs-only diff        empty matrix, no publish        (every changed file is *.md)
 *     push tag v*              full matrix (MANDATORY), publish→latest/next by version
 *     push        feature      tests only if --run-tests[=os], never publish
 *     any         --skip-ci    nothing (ignored on a tag)
 *
 * Note: ci.yml does NOT gate pushes to `main` (the PR is the gate; main only changes via an already-tested PR or a
 * release commit, and the release commit is gated by its tag). So a push to `main` isn't normally fed here; the
 * defensive `main → full` below only covers a manual dispatch.
 *
 * Invariants (pinned by tests):
 *
 * 1. A tag always tests — no flag can skip it. (--skip-tests died in the CI rework: prereleases test like stables; when a
 *    broken prerelease must ship anyway, fix it locally instead of publishing untested bytes.)
 * 2. `publish` is true only for tags — structurally unreachable from PRs, forks, branch pushes.
 * 3. The gate stays green-or-skipped before publish (enforced by the workflow `if:`, not here).
 *
 * Commit-message flags (dash style): --run-tests, optionally `=os,os` (linux/ubuntu, windows/win, macos/mac; bare = all
 * OSes), and --skip-ci.
 */
import { buildPlan, discoverTestFiles, verifyClasses } from './test.js'

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

export type DecideResult = { oses: string[]; publish: boolean }

/** Pure policy. See the module header for the truth table. */
export function decide({ event, refType, ref, message, changedFiles }: DecideInput): DecideResult {
  const full = [...FULL_OSES]

  // RELEASE — a tag is the only thing that publishes (invariant 2), and it ALWAYS tests (invariant 1).
  if (refType === 'tag') return { oses: full, publish: true }

  // --skip-ci short-circuits any non-tag run.
  if (hasSkipCi(message)) return { oses: [], publish: false }

  // GATE — never publishes (invariant 2).
  if (event === 'pull_request') {
    // A PR that touches only prose has nothing to build or test → skip the matrix. The `gate` job in
    // ci.yml stays green on the skip, so the required check still reports (a bare skip would hang the PR).
    if (isDocsOnly(changedFiles ?? [])) return { oses: [], publish: false }
    return { oses: full, publish: false }
  }
  if (ref === MAIN_BRANCH) return { oses: full, publish: false } // push to trunk

  // Any other branch: tests are opt-in via --run-tests (all, or a specific OS).
  const runTests = parseFlag(message, 'run-tests')
  if (runTests.present) return { oses: runTests.oses ?? full, publish: false }
  return { oses: [], publish: false }
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

  // The distribution plan (scripts/test.ts): parallel-lane group ids for the `test-fast` matrix, solo files
  // (heavy int + every e2e) for the one-runner-per-file `test-solo` matrix. Built from the checked-out tree
  // and validated (class suffixes vs file contents, no stale plan entries) — a broken plan fails the run
  // HERE, in `decide`, loudly and before a single test runner spins up.
  const files = await discoverTestFiles()
  await verifyClasses(files)
  const plan = buildPlan(files)

  const lines = [
    `oses=${JSON.stringify(result.oses)}`,
    `groups=${JSON.stringify(plan.groups.map((group) => group.id))}`,
    `solo=${JSON.stringify(plan.solo)}`,
    `publish=${result.publish}`,
  ]
  for (const line of lines) console.info(line)

  // Human-readable plan → stderr, so it lands in the `decide` job log WITHOUT polluting GITHUB_OUTPUT
  // (stdout is redirected there). Surfaces which files each group carries — a newly-added file shows up
  // here instead of silently unbalancing a group.
  for (const group of plan.groups) {
    console.error(`[plan] group "${group.id}" (${group.files.length}): ${group.files.join(', ')}`)
  }
  console.error(`[plan] solo (${plan.solo.length}): ${plan.solo.join(', ')}`)
}

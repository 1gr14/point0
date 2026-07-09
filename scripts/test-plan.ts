/**
 * How EVERY test file is distributed across CI runners — the single source of truth for the fast lane, layered on top
 * of {@link SLOW_TESTS} (the solo lane in scripts/slow-tests.ts). Consumed by the runner (scripts/test-parallel.ts) and
 * the matrix builder (scripts/ci-decide.ts), so the CI fast matrix SELF-SIZES from this file — there is no hardcoded
 * shard count to keep in sync.
 *
 * Two lanes, and every file lands in exactly one:
 *
 * - **solo** ({@link SLOW_TESTS}) — heavy integration/e2e files, ONE runner per file. They boot a full dev/build tree;
 *   sharing a process bleeds module state + ports, and one file per runner keeps a runner (Windows especially) from
 *   accumulating leaked browser/dev processes.
 * - **fast** — everything else, run in parallel, fanned across named GROUPS (one runner per group). Known-heavy files are
 *   PINNED into explicit groups via {@link FAST_GROUPS} so they never share a runner; everything not pinned lands in an
 *   auto `rest-N` group ({@link buildFastGroups}). Nothing is ever dropped, and a newly-added file surfaces in a rest
 *   group (logged by the runner / matrix builder) instead of silently unbalancing a shard.
 *
 * Paths are posix, relative to `packages/`.
 */
import * as nodePath from 'node:path'
import { SLOW_TESTS } from './slow-tests.js'

export { SLOW_TESTS }

/**
 * Fast files PINNED to a named runner. List a file here to keep it off the shared `rest` runners — either because it is
 * heavy (and would unbalance a rest group) or because it needs isolation. Every listed file must exist and must not
 * also be in {@link SLOW_TESTS} ({@link buildFastGroups} enforces both). Anything NOT listed here (and not solo) is
 * distributed across the auto `rest` groups.
 */
export const FAST_GROUPS: Record<string, readonly string[]> = {
  // Heavy in-process RSC coverage — isolated from each other and from the rest so one long file can't
  // stretch a shared runner. `core-rsc` additionally has a Windows-only "passes then won't exit" hang
  // (tracked in dev/backlog/ci-flakes.md); isolating it keeps that failure attributable and off siblings.
  'core-rsc': ['core/tests/rsc.test.tsx'],
  'engine-rsc': ['engine/tests/rsc.fast.test.tsx'],
  'engine-suspend': ['engine/tests/suspend.fast.test.tsx'],
}

/**
 * How many auto `rest-N` groups the leftover (non-solo, non-pinned) files are fanned across. Each rest runner carries
 * `ceil(rest / REST_GROUP_COUNT)` files; bump this as the suite grows so no rest runner gets heavy. (Pinned groups are
 * separate and unaffected.)
 */
export const REST_GROUP_COUNT = 2

/** Absolute path to `packages/`, the root every plan path is relative to. */
export const PACKAGES_DIR = nodePath.resolve(__dirname, '..', 'packages')

/** Dirs whose test files are never real suite files (build output, deps, VCS). */
const IGNORED_DIR_NAMES = ['node_modules', 'dist', 'packages-dist-npm', '.git']

/** Normalize an OS path to a posix, `packages/`-relative plan path. */
export const toPlanPath = (absOrRel: string): string => {
  const abs = nodePath.isAbsolute(absOrRel) ? absOrRel : nodePath.resolve(PACKAGES_DIR, absOrRel)
  return nodePath.relative(PACKAGES_DIR, abs).split(nodePath.sep).join('/')
}

/** Discover every test file under `packages/`, as posix paths relative to `packages/`, sorted. */
export const discoverTestFiles = async (): Promise<string[]> => {
  const glob = new Bun.Glob('**/*.{test,spec}.{ts,tsx,js,jsx}')
  const files: string[] = []
  for await (const rel of glob.scan(PACKAGES_DIR)) {
    const abs = nodePath.resolve(PACKAGES_DIR, rel)
    if (IGNORED_DIR_NAMES.some((dir) => abs.split(nodePath.sep).includes(dir))) continue
    files.push(rel.split(nodePath.sep).join('/'))
  }
  return files.sort((a, b) => a.localeCompare(b))
}

export type FastGroup = { id: string; files: string[] }

/**
 * Distribute the fast (non-solo) files across runner groups. Pinned files ({@link FAST_GROUPS}) keep their group;
 * everything else is fanned round-robin across {@link REST_GROUP_COUNT} `rest-N` groups (sorted first, so the partition
 * is stable across runners). Validates the plan and never drops a file:
 *
 * - every pinned/solo path must exist (a stale path is a silent hole otherwise),
 * - no file may be pinned twice or be both solo and fast.
 *
 * Returns groups in stable order (pinned as declared, then `rest-1..N`); empty groups are removed. Pure — pass
 * {@link discoverTestFiles}()'s result so it stays testable without touching the disk.
 */
export const buildFastGroups = (allTestFiles: readonly string[]): FastGroup[] => {
  const all = [...allTestFiles].sort((a, b) => a.localeCompare(b))
  const present = new Set(all)
  const solo = new Set<string>(SLOW_TESTS)

  const pinnedOf = new Map<string, string>()
  for (const [id, files] of Object.entries(FAST_GROUPS)) {
    for (const file of files) {
      if (solo.has(file)) {
        throw new Error(`test-plan: "${file}" is in both SLOW_TESTS and fast group "${id}"`)
      }
      const prev = pinnedOf.get(file)
      if (prev) {
        throw new Error(`test-plan: "${file}" is pinned to two fast groups ("${prev}" and "${id}")`)
      }
      pinnedOf.set(file, id)
    }
  }
  for (const file of [...solo, ...pinnedOf.keys()]) {
    if (!present.has(file)) {
      throw new Error(`test-plan: listed test file not found: "${file}" (stale path in the plan?)`)
    }
  }

  const rest = all.filter((file) => !solo.has(file) && !pinnedOf.has(file))
  const restBuckets: string[][] = Array.from({ length: Math.max(1, REST_GROUP_COUNT) }, () => [])
  rest.forEach((file, index) => restBuckets[index % restBuckets.length].push(file))

  const groups: FastGroup[] = [
    ...Object.entries(FAST_GROUPS).map(([id, files]) => ({ id, files: [...files] })),
    ...restBuckets.map((files, index) => ({ id: `rest-${index + 1}`, files })),
  ]
  return groups.filter((group) => group.files.length > 0)
}

/** Build the fast plan from the current tree (globs the disk, then {@link buildFastGroups}). */
export const buildFastGroupsFromDisk = async (): Promise<FastGroup[]> => buildFastGroups(await discoverTestFiles())

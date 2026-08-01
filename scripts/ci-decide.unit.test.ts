import { describe, expect, it } from 'bun:test'
import { decide, FULL_OSES, isDocsOnly, type DecideInput } from './ci-decide.js'

const FULL = [...FULL_OSES]
const LINUX = ['ubuntu-latest']
const run = (over: Partial<DecideInput>): DecideInput => ({
  event: 'push',
  refType: 'branch',
  ref: 'feature',
  message: '',
  ...over,
})

describe('ci-decide', () => {
  describe('gate (no publish ever)', () => {
    it('pull_request → full matrix', () => {
      expect(decide(run({ event: 'pull_request', ref: '7/merge' }))).toMatchObject({
        oses: FULL,
        publish: false,
      })
    })

    it('workflow_dispatch on main → full matrix, never publishes', () => {
      expect(decide(run({ event: 'workflow_dispatch', ref: 'main', message: 'squash merge' }))).toMatchObject({
        oses: FULL,
        publish: false,
      })
    })

    it('--skip-ci short-circuits a feature-branch run (never a push to main)', () => {
      expect(decide(run({ ref: 'feature', message: 'wip --skip-ci --run-tests' })).oses).toEqual([])
      expect(decide(run({ event: 'workflow_dispatch', ref: 'main', message: 'docs only --skip-ci' })).oses).toEqual([])
    })

    it('INVARIANT: commit-message flags are ignored on a PR — no flag can skip the merge gate', () => {
      expect(decide(run({ event: 'pull_request', ref: '7/merge', message: 'wip --skip-ci' })).oses).toEqual(FULL)
      expect(decide(run({ event: 'pull_request', ref: '7/merge', message: 'wip --skip-tests' })).oses).toEqual(FULL)
      // …only a provably docs-only diff skips (and stays gated by check):
      expect(
        decide(run({ event: 'pull_request', ref: '7/merge', message: '--skip-ci', changedFiles: ['docs/a.md'] })).oses,
      ).toEqual([])
    })

    it('feature branch: no tests unless asked', () => {
      expect(decide(run({ ref: 'feat-x', message: 'wip' })).oses).toEqual([])
    })

    it('feature branch: --run-tests runs the full matrix', () => {
      expect(decide(run({ message: '--run-tests' })).oses).toEqual(FULL)
    })

    it('feature branch: --run-tests=os is OS-granular', () => {
      expect(decide(run({ message: '--run-tests=linux' })).oses).toEqual(LINUX)
      expect(decide(run({ message: '--run-tests=linux,windows' })).oses).toEqual(FULL)
      // explicit opt-in to the off-by-default OS is honored
      expect(decide(run({ message: '--run-tests=macos' })).oses).toEqual(['macos-latest'])
    })

    describe('docs-only PR skips the matrix', () => {
      const pr = (changedFiles: string[]) => run({ event: 'pull_request', ref: '9/merge', changedFiles })

      it('every changed file is *.md → empty matrix', () => {
        expect(decide(pr(['dev/backlog/web-components.md'])).oses).toEqual([])
        expect(decide(pr(['docs/core/ssr.md', 'README.md', 'packages/core/README.md'])).oses).toEqual([])
      })

      it('any non-.md file in the diff → full matrix', () => {
        expect(decide(pr(['dev/backlog/note.md', 'packages/core/src/point0.ts'])).oses).toEqual(FULL)
        expect(decide(pr(['.github/workflows/ci.yml'])).oses).toEqual(FULL)
        expect(decide(pr(['examples/basic/src/pages/home.mdx'])).oses).toEqual(FULL) // .mdx is a point, not docs
        // non-.md even UNDER dev/ or docs/ must NOT skip — the whole point of the *.md-only rule.
        expect(decide(pr(['dev/scripts/tool.ts'])).oses).toEqual(FULL)
        expect(decide(pr(['docs/categories.json'])).oses).toEqual(FULL)
      })

      it('unknown/empty change set → full matrix (never skips blind)', () => {
        expect(decide(run({ event: 'pull_request', ref: '9/merge' })).oses).toEqual(FULL) // no changedFiles
        expect(decide(pr([])).oses).toEqual(FULL)
      })
    })
  })

  describe('isDocsOnly', () => {
    it('true only when every file is *.md', () => {
      expect(isDocsOnly(['dev/x.md', 'docs/y.md', 'anything.md'])).toBe(true)
      expect(isDocsOnly(['docs/a.md', 'packages/core/src/a.ts'])).toBe(false)
      expect(isDocsOnly(['dev/scripts/tool.ts'])).toBe(false) // under dev/ but executable → not docs
      expect(isDocsOnly(['docs/categories.json'])).toBe(false) // under docs/ but not markdown → not docs
      expect(isDocsOnly(['LICENSE'])).toBe(false)
      expect(isDocsOnly([])).toBe(false)
    })
  })

  describe('release (a push to main publishes)', () => {
    it('push to main → full matrix + publish', () => {
      expect(decide(run({ ref: 'main', message: 'chore(release): v0.1.0' }))).toMatchObject({
        oses: FULL,
        publish: true,
      })
    })

    it('a plain (non-release) push to main decides the same — npm, not the message, decides what ships', () => {
      expect(decide(run({ ref: 'main', message: 'fix: typo' }))).toMatchObject({ oses: FULL, publish: true })
    })

    it('INVARIANT: a push to main can never skip tests — no flag works', () => {
      for (const message of ['--skip-tests', '--skip-tests=linux,windows', '--skip-ci', '--run-tests=linux']) {
        expect(decide(run({ ref: 'main', message })).oses).toEqual(FULL)
      }
      // …not even a docs-only file set (which skips on a PR) weakens the release path.
      expect(decide(run({ ref: 'main', changedFiles: ['docs/x.md'] })).oses).toEqual(FULL)
    })

    it('a tag ref tests but never publishes — tags are the RESULT of a release, nothing listens on them', () => {
      for (const ref of ['v0.1.0', 'v0.1.0-next.3']) {
        expect(decide(run({ refType: 'tag', ref, message: 'chore(release): ' + ref }))).toMatchObject({
          oses: FULL,
          publish: false,
        })
      }
    })
  })

  describe('INVARIANT: publish is true only for a push to main', () => {
    const nonReleaseContexts: DecideInput[] = [
      run({ event: 'pull_request', ref: '1/merge' }),
      run({ event: 'pull_request', ref: '1/merge', message: 'chore(release): v0.1.0' }),
      run({ refType: 'tag', ref: 'v0.1.0' }),
      run({ ref: 'feature', message: '--run-tests' }),
      run({ ref: 'release-main', message: 'chore(release): v0.1.0' }), // not `main`, just looks like it
      run({ event: 'workflow_dispatch', ref: 'main' }),
    ]
    for (const ctx of nonReleaseContexts) {
      it(`${ctx.event} ${ctx.refType}:${ctx.ref} → publish=false`, () => {
        expect(decide(ctx).publish).toBe(false)
      })
    }
  })
})

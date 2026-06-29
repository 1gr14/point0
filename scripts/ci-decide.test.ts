import { describe, expect, it } from 'bun:test'
import { decide, FULL_OSES, type DecideInput } from './ci-decide.js'
import { SLOW_TESTS } from './slow-tests.js'

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
  it('always emits the slow-file list', () => {
    expect(decide(run({})).slow).toEqual([...SLOW_TESTS])
  })

  describe('gate (no publish ever)', () => {
    it('pull_request → full matrix', () => {
      expect(decide(run({ event: 'pull_request', ref: '7/merge' }))).toMatchObject({
        oses: FULL,
        publish: false,
      })
    })

    it('push to main → full matrix', () => {
      expect(decide(run({ ref: 'main', message: 'squash merge' }))).toMatchObject({
        oses: FULL,
        publish: false,
      })
    })

    it('--skip-tests does NOT skip the main-push gate', () => {
      expect(decide(run({ ref: 'main', message: 'x --skip-tests' })).oses).toEqual(FULL)
    })

    it('--skip-ci short-circuits a branch run', () => {
      expect(decide(run({ ref: 'main', message: 'docs only --skip-ci' })).oses).toEqual([])
      expect(decide(run({ ref: 'feature', message: 'wip --skip-ci --run-tests' })).oses).toEqual([])
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
  })

  describe('release (tags publish)', () => {
    it('stable tag → full matrix + publish', () => {
      expect(decide(run({ refType: 'tag', ref: 'v0.1.0', message: 'chore(release): v0.1.0' }))).toMatchObject({
        oses: FULL,
        publish: true,
      })
    })

    it('INVARIANT: a stable tag can never skip tests', () => {
      for (const message of ['--skip-tests', '--skip-tests=linux,windows', '--skip-ci']) {
        expect(decide(run({ refType: 'tag', ref: 'v2.0.0', message })).oses).toEqual(FULL)
      }
    })

    it('prerelease tag → full matrix + publish by default', () => {
      expect(decide(run({ refType: 'tag', ref: 'v0.1.0-next.3', message: 'release' }))).toMatchObject({
        oses: FULL,
        publish: true,
      })
    })

    it('prerelease tag: --skip-tests skips all but still publishes', () => {
      expect(decide(run({ refType: 'tag', ref: 'v0.1.0-next.3', message: 'release --skip-tests' }))).toMatchObject({
        oses: [],
        publish: true,
      })
    })

    it('prerelease tag: --skip-tests=os skips only that OS', () => {
      expect(decide(run({ refType: 'tag', ref: 'v0.1.0-next.3', message: '--skip-tests=windows' })).oses).toEqual(LINUX)
      expect(decide(run({ refType: 'tag', ref: 'v0.1.0-next.3', message: '--skip-tests=linux,windows' })).oses).toEqual(
        [],
      )
    })
  })

  describe('INVARIANT: publish is true only for tags', () => {
    const nonTagContexts: DecideInput[] = [
      run({ event: 'pull_request', ref: '1/merge' }),
      run({ ref: 'main' }),
      run({ ref: 'main', message: 'chore(release): v0.1.0' }),
      run({ ref: 'feature', message: '--run-tests' }),
      run({ event: 'workflow_dispatch', ref: 'main' }),
    ]
    for (const ctx of nonTagContexts) {
      it(`${ctx.event} ${ctx.refType}:${ctx.ref} → publish=false`, () => {
        expect(decide(ctx).publish).toBe(false)
      })
    }
  })
})

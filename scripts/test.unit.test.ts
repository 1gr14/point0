import { describe, expect, it } from 'bun:test'
import { buildPlan, classOf, extractFailureLines, passedButWouldNotExit, PINNED_GROUPS, SOLO_INT } from './test.js'

// A minimal live-looking tree: every validated list entry + a few regulars of each class.
const BASE_FILES = [
  ...SOLO_INT,
  ...Object.values(PINNED_GROUPS).flat(),
  'packages/core/tests/env.unit.test.ts',
  'packages/core/tests/error.unit.test.ts',
  'packages/engine/tests/query.int.test.tsx',
  'packages/engine/tests/mutation.int.test.tsx',
  'packages/engine/tests/rsc.e2e.test.tsx',
  'scripts/ci-decide.unit.test.ts',
]

describe('classOf', () => {
  it('reads the class from the suffix', () => {
    expect(classOf('packages/core/tests/env.unit.test.ts')).toBe('unit')
    expect(classOf('packages/engine/tests/query.int.test.tsx')).toBe('int')
    expect(classOf('packages/engine/tests/rsc.e2e.test.tsx')).toBe('e2e')
    expect(classOf('scripts/ci-decide.unit.test.ts')).toBe('unit')
  })

  it('throws on a suffixless test file', () => {
    expect(() => classOf('packages/core/tests/env.test.ts')).toThrow(/no class suffix/)
  })
})

describe('buildPlan', () => {
  it('plans every file exactly once: solo = SOLO_INT + all e2e, the rest grouped', () => {
    const plan = buildPlan(BASE_FILES)
    expect(plan.solo).toEqual(
      [...SOLO_INT, 'packages/engine/tests/rsc.e2e.test.tsx'].sort((a, b) => a.localeCompare(b)),
    )
    const grouped = plan.groups.flatMap((group) => group.files)
    expect([...plan.solo, ...grouped].sort()).toEqual([...BASE_FILES].sort())
    // no file appears twice
    expect(new Set([...plan.solo, ...grouped]).size).toBe(BASE_FILES.length)
  })

  it('keeps the pinned files in their named groups, off the auto groups', () => {
    const plan = buildPlan(BASE_FILES)
    for (const [id, files] of Object.entries(PINNED_GROUPS)) {
      expect(plan.groups.find((group) => group.id === id)?.files).toEqual([...files])
    }
    const auto = plan.groups.filter((group) => group.id === 'unit' || group.id.startsWith('int-'))
    const pinned = new Set(Object.values(PINNED_GROUPS).flat())
    for (const group of auto) for (const file of group.files) expect(pinned.has(file)).toBe(false)
  })

  it('splits unit and int into separate auto groups', () => {
    const plan = buildPlan(BASE_FILES)
    const unit = plan.groups.find((group) => group.id === 'unit')
    expect(unit?.files).toContain('packages/core/tests/env.unit.test.ts')
    expect(unit?.files).toContain('scripts/ci-decide.unit.test.ts')
    const int1 = plan.groups.find((group) => group.id === 'int-1')
    expect(int1?.files).toContain('packages/engine/tests/query.int.test.tsx')
  })

  it('throws when a validated list entry goes stale', () => {
    const withoutSolo = BASE_FILES.filter((file) => file !== SOLO_INT[0])
    expect(() => buildPlan(withoutSolo)).toThrow(/SOLO_INT lists a missing file/)
    const pinnedFile = Object.values(PINNED_GROUPS).flat()[0]
    const withoutPinned = BASE_FILES.filter((file) => file !== pinnedFile)
    expect(() => buildPlan(withoutPinned)).toThrow(/lists a missing file/)
  })
})

describe('extractFailureLines', () => {
  it('matches real failure markers only — never a passing test whose NAME mentions failing', () => {
    const output = [
      '✓ handles a failed fetch gracefully',
      'error: deliberately logged by the test',
      '(fail) dev > vite > have hmr client updates [15000.00ms]',
      ' 3 fail',
      '[harness] TIMED OUT after 300s — process tree killed.',
    ].join('\n')
    const lines = extractFailureLines(output)
    expect(lines).toContain('(fail) dev > vite > have hmr client updates [15000.00ms]')
    expect(lines).toContain(' 3 fail')
    expect(lines).toContain('[harness] TIMED OUT after 300s — process tree killed.')
    expect(lines).not.toContain('✓ handles a failed fetch gracefully')
    expect(lines).not.toContain('error: deliberately logged by the test')
  })

  it('a green summary has no failure markers', () => {
    const output = ['✓ works', ' 61 pass', ' 0 fail', 'Ran 61 tests across 1 file.'].join('\n')
    // no marker → tail fallback returns the whole (short) log, and crucially " 0 fail" is not a marker
    expect(extractFailureLines(output)).toEqual(['✓ works', ' 61 pass', ' 0 fail', 'Ran 61 tests across 1 file.'])
  })

  it('falls back to the log TAIL (where a hang ends), not the head', () => {
    const lines = Array.from({ length: 60 }, (_, i) => `line ${i + 1}`)
    expect(extractFailureLines(lines.join('\n'))).toEqual(lines.slice(-20))
  })
})

describe('passedButWouldNotExit', () => {
  it('true only for a full green summary', () => {
    expect(passedButWouldNotExit(' 61 pass\n 0 fail\nRan 61 tests across 1 file.')).toBe(true)
    expect(passedButWouldNotExit(' 60 pass\n 1 fail')).toBe(false)
    expect(passedButWouldNotExit(' 0 fail')).toBe(false) // no pass count — the summary never printed
    expect(passedButWouldNotExit(' 61 pass\n 0 fail\n(fail) late failure')).toBe(false)
    expect(passedButWouldNotExit('')).toBe(false)
  })
})

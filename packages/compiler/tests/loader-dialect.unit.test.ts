import { afterAll, beforeAll, describe, expect, it, setDefaultTimeout, spyOn } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { compilerBunPlugin, relocatedExtension } from '../src/plugin/bun.js'

// Every cell here is two real `Bun.build`s, and under the parallel runner (which saturates every core) that outruns
// bun's 5s default — observed as timeouts on a loaded machine, which is exactly what CI is. Same guard, same reason as
// compiler.unit.test.ts.
setDefaultTimeout(30000)

// One contract, checked exhaustively: **a file's extension decides its syntax, and every path point0 runs it through
// agrees on the answer.** There are two such paths, and they arrive at the loader completely differently:
//
//   - through the point0 plugin — `dev` and `build`. The plugin claims the file and hands Bun an EXPLICIT loader
//     (`guessLoader`), so the name on disk doesn't matter.
//   - as a file Bun loads by name — the `dev --hot` store. Flattened copies live outside `compiler.filter` on purpose,
//     so the loader comes from the filename alone and nothing can override it. `relocatedExtension` picks that name.
//
// Both directions of disagreement have bitten. The store named every file `.tsx`, so `.ts` generic arrows died under
// `--hot` only. And `.js` is jsx-enabled by extension but gets the stricter `js` loader from the plugin (it must — the
// filter also claims `@point0/*` dist bundles), so a `.js` name in the store would accept JSX that `dev` and `build`
// reject. Neither shows up in a normal test run, because each mode alone is self-consistent. Only the comparison
// finds them.

const tempDir = nodePath.join(__dirname, 'temp/loader-dialect')

const JSX = 'export const a = () => <div>hi</div>\n'
const TS = 'export const n: number = 1\n'
/** Every code extension `Compiler.defaultFilter` claims. */
const EXTENSIONS = ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs'] as const

/** `dev` / `build`: the plugin claims the file and picks the loader itself. Throws ⇒ rejected, same as a failed build. */
const buildViaPlugin = async (file: string): Promise<boolean> => {
  try {
    const result = await Bun.build({
      entrypoints: [file],
      target: 'bun',
      plugins: [compilerBunPlugin({ side: 'server', scope: 'root', mode: 'development' })],
    })
    return result.success
  } catch {
    return false
  }
}

/** `dev --hot`: the same source, copied to the name the store would give it, loaded by that name alone. */
const buildViaStoreName = async (file: string): Promise<boolean> => {
  const moved = file.replace(/\.[^./]+$/, '') + '.moved' + relocatedExtension(file)
  nodeFs.copyFileSync(file, moved)
  try {
    return (await Bun.build({ entrypoints: [moved], target: 'bun' })).success
  } catch {
    return false
  }
}

const write = (name: string, code: string): string => {
  const file = nodePath.join(tempDir, name)
  nodeFs.writeFileSync(file, code)
  return file
}

describe('extension → syntax, across every path a file takes', () => {
  // Half the fixtures here are meant to be rejected, and the compiler now REPORTS what it couldn't compile — correct
  // behaviour, but it would bury this file's output in expected stack traces. Silence it for the file only.
  let errorSpy: ReturnType<typeof spyOn>

  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
    errorSpy = spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(() => {
    errorSpy.mockRestore()
    // Not just tidiness: these fixtures are deliberately invalid, and `tsc` type-checks `tests/` — leaving them on
    // disk makes `bun run types` fail on files that are supposed to be broken.
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
  })

  // Each cell is built once, in the per-cell test, and its plugin answer is kept for the two summary assertions below —
  // they check the same builds from a different angle rather than re-running all 16.
  const acceptedByPlugin: Record<string, string[]> = { JSX: [], TypeScript: [] }

  for (const [label, code] of [
    ['JSX', JSX],
    ['TypeScript', TS],
  ] as const) {
    for (const ext of EXTENSIONS) {
      it(`answers the same for ${label} in a .${ext} file whether the plugin claims it or the store moved it`, async () => {
        const file = write(`${label}.${ext}`, code)
        const viaPlugin = await buildViaPlugin(file)
        const viaStoreName = await buildViaStoreName(file)
        if (viaPlugin) (acceptedByPlugin[label] as string[]).push(ext)
        expect({ ext, label, viaPlugin }).toEqual({ ext, label, viaPlugin: viaStoreName })
      })
    }
  }

  // The agreed answers themselves, so a change that keeps the two paths in sync but moves BOTH still has to be
  // deliberate. `.js` sits with the plain-JS extensions here, not the JSX ones: point0 wants JSX in `.jsx`.
  // These run after the cells above (bun runs a file's tests in order), reading what those builds already found.
  it('accepts JSX exactly in .tsx / .jsx', () => {
    expect(acceptedByPlugin.JSX).toEqual(['tsx', 'jsx'])
  })

  it('accepts TypeScript exactly in .ts / .tsx / .mts / .cts', () => {
    expect(acceptedByPlugin.TypeScript).toEqual(['ts', 'tsx', 'mts', 'cts'])
  })

  it('moves a file only when the name would change its loader', () => {
    // `.js` and markdown are the two that must be renamed; everything else is already its own answer.
    expect(EXTENSIONS.map((ext) => relocatedExtension(`/a/b.${ext}`))).toEqual([
      '.ts',
      '.tsx',
      '.mts',
      '.cts',
      '.mjs', // `.js` by name is jsx-enabled; the plugin gives it the stricter `js` loader
      '.jsx',
      '.mjs',
      '.cjs',
    ])
    for (const ext of ['md', 'mdx', 'mdc']) expect(relocatedExtension(`/a/b.${ext}`)).toBe('.mjs')
  })
})

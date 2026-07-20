import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { FileResolver } from '../src/resolver.js'
// `resolveFilePath` returns posix identifiers; normalize expected paths (built native by `node:path`) to match.
import { toPosixPath as posix } from '../src/utils.js'

const generalTempDir = nodePath.join(__dirname, 'temp/resolver')

const prepareRandomTempDir = () => {
  const tempDir = nodePath.join(generalTempDir, crypto.randomUUID())
  nodeFs.mkdirSync(tempDir, { recursive: true })
  return tempDir
}

const helper = (callback: ({ tempDir }: { tempDir: string }) => void | Promise<void>) => {
  return async () => {
    // Clear cache before each test to avoid interference between concurrent tests
    FileResolver.clearCache()
    const tempDir = prepareRandomTempDir()
    try {
      await callback({ tempDir })
    } finally {
      // Clean up the unique temp directory for this test
      try {
        nodeFs.rmSync(tempDir, { recursive: true, force: true })
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

describe('FileResolver', () => {
  beforeAll(() => {
    nodeFs.rmSync(generalTempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(generalTempDir, { recursive: true })
    // Clear cache before tests to avoid interference between tests
    FileResolver.clearCache()
  })

  describe('#detectExistingFilePathByImportPath', () => {
    it.concurrent(
      'resolves relative import with .ts extension',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const file2Path = nodePath.join(tempDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2Path, 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: './file2.ts',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(file2Path))
      }),
    )

    it.concurrent(
      'resolves relative import without extension (.ts)',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const file2Path = nodePath.join(tempDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2Path, 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: './file2',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(file2Path))
      }),
    )

    it.concurrent(
      'resolves relative import without extension (.tsx)',
      helper(async ({ tempDir }) => {
        const basename = crypto.randomUUID()
        const file1Path = nodePath.join(tempDir, `${basename}_file1.tsx`)
        const file2TsxPath = nodePath.join(tempDir, `${basename}_file2.tsx`)
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2TsxPath, 'export const b = 2')
        // Ensure no .ts file exists
        const file2TsPath = nodePath.join(tempDir, `${basename}_file2.ts`)
        try {
          nodeFs.unlinkSync(file2TsPath)
        } catch {
          // File doesn't exist, which is what we want
        }

        const resolved = FileResolver.resolveFilePath({
          path: `./${basename}_file2`,
          importer: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .tsx
        expect(resolved).toBe(posix(file2TsxPath))
      }),
    )

    it.concurrent(
      'resolves relative import without extension (.js)',
      helper(async ({ tempDir }) => {
        const basename = crypto.randomUUID()
        const file1Path = nodePath.join(tempDir, `${basename}_file1.ts`)
        const file2JsPath = nodePath.join(tempDir, `${basename}_file2.js`)
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2JsPath, 'export const b = 2')
        // Ensure no .ts, .tsx files exist
        try {
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.ts`))
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.tsx`))
        } catch {
          // Files don't exist, which is what we want
        }

        const resolved = FileResolver.resolveFilePath({
          path: `./${basename}_file2`,
          importer: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .js
        expect(resolved).toBe(posix(file2JsPath))
      }),
    )

    it.concurrent(
      'resolves relative import in subdirectory',
      helper(async ({ tempDir }) => {
        const subDir = nodePath.join(tempDir, 'subdir')
        nodeFs.mkdirSync(subDir, { recursive: true })
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const file2Path = nodePath.join(subDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2Path, 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: './subdir/file2',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(file2Path))
      }),
    )

    it.concurrent(
      'resolves parent directory import',
      helper(async ({ tempDir }) => {
        const subDir = nodePath.join(tempDir, 'subdir')
        nodeFs.mkdirSync(subDir, { recursive: true })
        const file1Path = nodePath.join(subDir, 'file1.ts')
        const file2Path = nodePath.join(tempDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2Path, 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: '../file2',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(file2Path))
      }),
    )

    it.concurrent(
      'returns undefined for non-existent file',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: './nonexistent',
          importer: file1Path,
        })

        expect(resolved).toBeUndefined()
      }),
    )

    it.concurrent(
      'returns  absolute path without containingFile',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: file1Path,
          importer: undefined,
        })

        expect(resolved).toBe(posix(file1Path))
      }),
    )

    it.concurrent(
      'handles import without containingFile',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: './file1',
        })

        // Without containingFile, relative paths can't be resolved
        expect(resolved).toBeUndefined()
      }),
    )

    it.concurrent(
      'handles non-relative import without containingFile',
      helper(async () => {
        const resolved = FileResolver.resolveFilePath({
          path: '@point0/core',
        })

        // Non-relative imports without containingFile can't be resolved
        expect(resolved).toBeUndefined()
      }),
    )

    it.concurrent(
      'resolves .mjs extension',
      helper(async ({ tempDir }) => {
        const basename = crypto.randomUUID()
        const file1Path = nodePath.join(tempDir, `${basename}_file1.ts`)
        const file2MjsPath = nodePath.join(tempDir, `${basename}_file2.mjs`)
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2MjsPath, 'export const b = 2')
        // Ensure no .ts, .tsx, .js files exist
        try {
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.ts`))
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.tsx`))
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.js`))
        } catch {
          // Files don't exist, which is what we want
        }

        const resolved = FileResolver.resolveFilePath({
          path: `./${basename}_file2`,
          importer: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .mjs
        expect(resolved).toBe(posix(file2MjsPath))
      }),
    )

    it.concurrent(
      'resolves .cjs extension',
      helper(async ({ tempDir }) => {
        const basename = crypto.randomUUID()
        const file1Path = nodePath.join(tempDir, `${basename}_file1.ts`)
        const file2CjsPath = nodePath.join(tempDir, `${basename}_file2.cjs`)
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2CjsPath, 'export const b = 2')
        // Ensure no .ts, .tsx, .js, .mjs files exist
        try {
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.ts`))
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.tsx`))
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.js`))
          nodeFs.unlinkSync(nodePath.join(tempDir, `${basename}_file2.mjs`))
        } catch {
          // Files don't exist, which is what we want
        }

        const resolved = FileResolver.resolveFilePath({
          path: `./${basename}_file2`,
          importer: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .cjs
        expect(resolved).toBe(posix(file2CjsPath))
      }),
    )

    it.concurrent(
      'prefers .ts over .js when both exist',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const file2TsPath = nodePath.join(tempDir, 'file2.ts')
        const file2JsPath = nodePath.join(tempDir, 'file2.js')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2TsPath, 'export const b = 2')
        await Bun.write(file2JsPath, 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: './file2',
          importer: file1Path,
        })

        // Should prefer .ts over .js
        expect(resolved).toBe(posix(file2TsPath))
      }),
    )

    it.concurrent(
      'handles TypeScript path aliases when tsconfig.json exists',
      helper(async ({ tempDir }) => {
        // Create tsconfig.json with path alias
        const tsConfigPath = nodePath.join(tempDir, 'tsconfig.json')
        const tsConfig = {
          compilerOptions: {
            baseUrl: '.',
            paths: {
              '@/*': ['src/*'],
            },
          },
        }
        await Bun.write(tsConfigPath, JSON.stringify(tsConfig, null, 2))

        // Create src directory and file
        const srcDir = nodePath.join(tempDir, 'src')
        nodeFs.mkdirSync(srcDir, { recursive: true })
        const aliasedFile = nodePath.join(srcDir, 'utils.ts')
        await Bun.write(aliasedFile, 'export const utils = {}')

        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: '@/utils',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(aliasedFile))
      }),
    )

    it.concurrent(
      'handles index file resolution via TypeScript',
      helper(async ({ tempDir }) => {
        // Create tsconfig.json
        const tsConfigPath = nodePath.join(tempDir, 'tsconfig.json')
        const tsConfig = {
          compilerOptions: {
            baseUrl: '.',
          },
        }
        await Bun.write(tsConfigPath, JSON.stringify(tsConfig, null, 2))

        // Create directory with index file
        const subDir = nodePath.join(tempDir, 'subdir')
        nodeFs.mkdirSync(subDir, { recursive: true })
        const indexFile = nodePath.join(subDir, 'index.ts')
        await Bun.write(indexFile, 'export const a = 1')

        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: './subdir',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(indexFile))
      }),
    )

    // The resolver reads tsconfig `paths` itself and never loads the TypeScript compiler — TypeScript 7 ships no JS
    // API, so a project on 7 (or with no typescript installed at all) must resolve exactly like one on 6.
    it.concurrent(
      'resolves a directory to its index file with no tsconfig involved',
      helper(async ({ tempDir }) => {
        const subDir = nodePath.join(tempDir, 'subdir')
        nodeFs.mkdirSync(subDir, { recursive: true })
        const indexFile = nodePath.join(subDir, 'index.ts')
        await Bun.write(indexFile, 'export const a = 1')

        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: './subdir',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(indexFile))
      }),
    )

    it.concurrent(
      'prefers a sibling file over a directory of the same name',
      helper(async ({ tempDir }) => {
        const subDir = nodePath.join(tempDir, 'points')
        nodeFs.mkdirSync(subDir, { recursive: true })
        await Bun.write(nodePath.join(subDir, 'index.ts'), 'export const a = 1')
        const siblingFile = nodePath.join(tempDir, 'points.ts')
        await Bun.write(siblingFile, 'export const b = 2')

        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: './points',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(siblingFile))
      }),
    )

    it.concurrent(
      'resolves .mts, .cts and .jsx extensions',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        for (const ext of ['.mts', '.cts', '.jsx']) {
          const basename = crypto.randomUUID()
          const target = nodePath.join(tempDir, `${basename}${ext}`)
          await Bun.write(target, 'export const b = 2')

          const resolved = FileResolver.resolveFilePath({
            path: `./${basename}`,
            importer: file1Path,
          })

          expect(resolved).toBe(posix(target))
        }
      }),
    )

    it.concurrent(
      'resolves an ESM-style .js specifier to its .ts source',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const file2Path = nodePath.join(tempDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2Path, 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: './file2.js',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(file2Path))
      }),
    )

    // The shape `create-point0-app` scaffolds: `paths` with no `baseUrl`, so the alias base is the directory of the
    // tsconfig that declared it. This is the exact case that broke on TypeScript 7.
    it.concurrent(
      'resolves a path alias declared without baseUrl',
      helper(async ({ tempDir }) => {
        const tsConfigPath = nodePath.join(tempDir, 'tsconfig.json')
        await Bun.write(tsConfigPath, JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }, null, 2))

        const srcDir = nodePath.join(tempDir, 'src', 'lib')
        nodeFs.mkdirSync(srcDir, { recursive: true })
        const aliasedFile = nodePath.join(srcDir, 'root.ts')
        await Bun.write(aliasedFile, 'export const root = 1')

        const file1Path = nodePath.join(tempDir, 'src', 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: '@/lib/root',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(aliasedFile))
      }),
    )

    it.concurrent(
      'resolves a path alias inherited through extends',
      helper(async ({ tempDir }) => {
        await Bun.write(
          nodePath.join(tempDir, 'tsconfig.base.json'),
          JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }, null, 2),
        )
        await Bun.write(
          nodePath.join(tempDir, 'tsconfig.json'),
          // Comments and a trailing comma: real tsconfigs are JSONC, and we parse them as such.
          '{\n  // inherits the alias\n  "extends": "./tsconfig.base.json",\n  "compilerOptions": { "strict": true },\n}\n',
        )

        const srcDir = nodePath.join(tempDir, 'src')
        nodeFs.mkdirSync(srcDir, { recursive: true })
        const aliasedFile = nodePath.join(srcDir, 'utils.ts')
        await Bun.write(aliasedFile, 'export const utils = {}')

        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: '@/utils',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(aliasedFile))
      }),
    )

    it.concurrent(
      'resolves a non-module asset through a path alias',
      helper(async ({ tempDir }) => {
        await Bun.write(
          nodePath.join(tempDir, 'tsconfig.json'),
          JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'] } } }, null, 2),
        )

        const assetsDir = nodePath.join(tempDir, 'src', 'assets')
        nodeFs.mkdirSync(assetsDir, { recursive: true })
        const assetFile = nodePath.join(assetsDir, 'gem.png')
        await Bun.write(assetFile, 'not really a png')

        const file1Path = nodePath.join(tempDir, 'src', 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: '@/assets/gem.png',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(assetFile))
      }),
    )

    it.concurrent(
      'returns the intended path for a file that does not exist yet when existing is false',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: './generated/assets.ts',
          importer: file1Path,
          existing: false,
        })

        expect(resolved).toBe(posix(nodePath.join(tempDir, 'generated', 'assets.ts')))
      }),
    )

    it.concurrent(
      'leaves a bare npm specifier unresolved',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: 'react-dom/server',
          importer: file1Path,
        })

        expect(resolved).toBeUndefined()
      }),
    )

    // `.server` is part of the filename, not an extension — point0 itself ships `points.server.ts`. Resolving this by
    // REPLACING the trailing ".server" would look for `points.ts`: missing, or a different module entirely.
    it.concurrent(
      'resolves a specifier whose name contains a dot',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'engine.ts')
        const target = nodePath.join(tempDir, 'points.server.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(target, 'export const b = 2')
        // A same-stem module that must NOT be picked instead.
        await Bun.write(nodePath.join(tempDir, 'points.ts'), 'export const c = 3')

        const resolved = FileResolver.resolveFilePath({
          path: './points.server',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(target))
      }),
    )

    it.concurrent(
      'prefers the .ts source over a built .js sitting next to it',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const sourcePath = nodePath.join(tempDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(sourcePath, 'export const b = 2')
        await Bun.write(nodePath.join(tempDir, 'file2.js'), 'export const b = 2')

        const resolved = FileResolver.resolveFilePath({
          path: './file2.js',
          importer: file1Path,
        })

        // Bun and Vite both compile the source, so the walker has to read the same file they do.
        expect(resolved).toBe(posix(sourcePath))
      }),
    )

    // Pins the two `paths` behaviours we now delegate to get-tsconfig, so a change in it can't drift us silently.
    it.concurrent(
      'picks the most specific of two overlapping path aliases',
      helper(async ({ tempDir }) => {
        await Bun.write(
          nodePath.join(tempDir, 'tsconfig.json'),
          JSON.stringify({ compilerOptions: { paths: { '@/*': ['./src/*'], '@/gen/*': ['./generated/*'] } } }, null, 2),
        )

        const generatedDir = nodePath.join(tempDir, 'generated')
        nodeFs.mkdirSync(generatedDir, { recursive: true })
        const generatedFile = nodePath.join(generatedDir, 'routes.ts')
        await Bun.write(generatedFile, 'export const routes = {}')
        // The looser `@/*` would land here; the more specific pattern must win, as it does in TypeScript.
        const srcGenDir = nodePath.join(tempDir, 'src', 'gen')
        nodeFs.mkdirSync(srcGenDir, { recursive: true })
        await Bun.write(nodePath.join(srcGenDir, 'routes.ts'), 'export const wrong = true')

        const file1Path = nodePath.join(tempDir, 'src', 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: '@/gen/routes',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(generatedFile))
      }),
    )

    it.concurrent(
      'resolves through baseUrl when the tsconfig declares no paths',
      helper(async ({ tempDir }) => {
        await Bun.write(
          nodePath.join(tempDir, 'tsconfig.json'),
          JSON.stringify({ compilerOptions: { baseUrl: '.' } }, null, 2),
        )

        const srcDir = nodePath.join(tempDir, 'src')
        nodeFs.mkdirSync(srcDir, { recursive: true })
        const target = nodePath.join(srcDir, 'util.ts')
        await Bun.write(target, 'export const util = 1')

        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.resolveFilePath({
          path: 'src/util',
          importer: file1Path,
        })

        expect(resolved).toBe(posix(target))
      }),
    )
  })
})

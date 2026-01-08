import { beforeAll, describe, expect, it } from 'bun:test'
import * as nodeFs from 'node:fs'
import * as nodePath from 'node:path'
import { FileResolver } from '../src/resolver.js'

const generalTempDir = nodePath.join(__dirname, 'temp/resolver')

const prepareRandomTempDir = () => {
  const tempDir = nodePath.join(generalTempDir, crypto.randomUUID())
  nodeFs.mkdirSync(tempDir, { recursive: true })
  return tempDir
}

const helper = (callback: ({ tempDir }: { tempDir: string }) => any) => {
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './file2.ts',
          containingFile: file1Path,
        })

        expect(resolved).toBe(file2Path)
      }),
    )

    it.concurrent(
      'resolves relative import without extension (.ts)',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        const file2Path = nodePath.join(tempDir, 'file2.ts')
        await Bun.write(file1Path, 'export const a = 1')
        await Bun.write(file2Path, 'export const b = 2')

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './file2',
          containingFile: file1Path,
        })

        expect(resolved).toBe(file2Path)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: `./${basename}_file2`,
          containingFile: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .tsx
        expect(resolved).toBe(file2TsxPath)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: `./${basename}_file2`,
          containingFile: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .js
        expect(resolved).toBe(file2JsPath)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './subdir/file2',
          containingFile: file1Path,
        })

        expect(resolved).toBe(file2Path)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: '../file2',
          containingFile: file1Path,
        })

        expect(resolved).toBe(file2Path)
      }),
    )

    it.concurrent(
      'returns undefined for non-existent file',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './nonexistent',
          containingFile: file1Path,
        })

        expect(resolved).toBeUndefined()
      }),
    )

    it.concurrent(
      'returns undefined for absolute path without containingFile',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: file1Path,
          containingFile: undefined,
        })

        expect(resolved).toBeUndefined()
      }),
    )

    it.concurrent(
      'handles import without containingFile',
      helper(async ({ tempDir }) => {
        const file1Path = nodePath.join(tempDir, 'file1.ts')
        await Bun.write(file1Path, 'export const a = 1')

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './file1',
        })

        // Without containingFile, relative paths can't be resolved
        expect(resolved).toBeUndefined()
      }),
    )

    it.concurrent(
      'handles non-relative import without containingFile',
      helper(async ({ tempDir }) => {
        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: '@point0/core',
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: `./${basename}_file2`,
          containingFile: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .mjs
        expect(resolved).toBe(file2MjsPath)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: `./${basename}_file2`,
          containingFile: file1Path,
        })

        // Resolver prefers .ts first, but if it doesn't exist, should find .cjs
        expect(resolved).toBe(file2CjsPath)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './file2',
          containingFile: file1Path,
        })

        // Should prefer .ts over .js
        expect(resolved).toBe(file2TsPath)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: '@/utils',
          containingFile: file1Path,
        })

        expect(resolved).toBe(aliasedFile)
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

        const resolved = FileResolver.detectExistingFilePathByImportPath({
          importPath: './subdir',
          containingFile: file1Path,
        })

        // TypeScript resolver should resolve to index.ts
        expect(resolved).toBe(indexFile)
      }),
    )
  })
})

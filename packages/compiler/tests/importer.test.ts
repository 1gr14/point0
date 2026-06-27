import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { parseImporterOptions, resolveImporterRule } from '../src/importer.js'
// Importer rules/globs are posix-normalized internally; normalize absolute expected paths (built native) to match.
import { toPosixPath as posix } from '../src/utils.js'

const tempDir = nodePath.join(__dirname, 'temp/importer')

describe('importer', () => {
  beforeAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
    nodeFs.mkdirSync(tempDir, { recursive: true })
  })

  afterAll(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('#parseImporterOptions', () => {
    const setupPackageJson = ({
      cwd,
      relativePath = 'deps/package.json',
    }: {
      cwd: string
      relativePath?: string
    }): string => {
      const packageJsonPath = nodePath.join(cwd, relativePath)
      nodeFs.mkdirSync(nodePath.dirname(packageJsonPath), { recursive: true })
      nodeFs.writeFileSync(
        packageJsonPath,
        JSON.stringify({
          dependencies: {
            react: '^19.0.0',
            lodash: '^4.17.21',
          },
        }),
      )
      return packageJsonPath
    }

    it('normalizes positive module pattern', () => {
      const options = parseImporterOptions({
        mock: ['react'],
      })

      expect(options.mock.include).toEqual(['**/node_modules/react{,/**}'])
      expect(options.mock.exclude).toEqual([])
      expect(options.map.mock['**/node_modules/react{,/**}']).toBe('react')
    })

    it('normalizes negative module pattern', () => {
      const options = parseImporterOptions({
        mock: ['!react'],
      })

      expect(options.mock.include).toEqual([])
      expect(options.mock.exclude).toEqual(['**/node_modules/react{,/**}'])
      expect(options.map.mock['**/node_modules/react{,/**}']).toBeUndefined()
    })

    it('normalizes positive relative pattern', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const options = parseImporterOptions({
        cwd,
        mock: ['./src/local.ts'],
      })

      expect(options.mock.include).toEqual([posix(nodePath.resolve(cwd, './src/local.ts'))])
      expect(options.mock.exclude).toEqual([])
      expect(options.map.mock[posix(nodePath.resolve(cwd, './src/local.ts'))]).toBe('./src/local.ts')
    })

    it('normalizes negative relative pattern', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const options = parseImporterOptions({
        cwd,
        mock: ['!./src/local.ts'],
      })

      expect(options.mock.include).toEqual([])
      expect(options.mock.exclude).toEqual([posix(nodePath.resolve(cwd, './src/local.ts'))])
      expect(options.map.mock[posix(nodePath.resolve(cwd, './src/local.ts'))]).toBeUndefined()
    })

    it('expands positive package.json pattern', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      setupPackageJson({ cwd })

      const options = parseImporterOptions({
        cwd,
        mock: ['deps/package.json'],
      })

      expect(options.mock.include).toContain('**/node_modules/react{,/**}')
      expect(options.mock.include).toContain('**/node_modules/lodash{,/**}')
      expect(options.mock.exclude).toEqual([])
      expect(options.map.mock['**/node_modules/react{,/**}']).toBe('deps/package.json:react')
      expect(options.map.mock['**/node_modules/lodash{,/**}']).toBe('deps/package.json:lodash')
    })

    it('expands negative package.json pattern into excludes', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      setupPackageJson({ cwd })

      const options = parseImporterOptions({
        cwd,
        mock: ['!deps/package.json'],
      })

      expect(options.mock.include).toEqual([])
      expect(options.mock.exclude).toContain('**/node_modules/react{,/**}')
      expect(options.mock.exclude).toContain('**/node_modules/lodash{,/**}')
      expect(options.map.mock['**/node_modules/react{,/**}']).toBeUndefined()
      expect(options.map.mock['**/node_modules/lodash{,/**}']).toBeUndefined()
    })

    it('normalizes all option kinds together', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      setupPackageJson({ cwd })

      const options = parseImporterOptions({
        cwd,
        deny: ['deps/package.json', '!react', './src/local.ts', /^@org\/pkg/],
      })

      expect(options.cwd).toBe(cwd)
      expect(options.deny.include).toContain('**/node_modules/react{,/**}')
      expect(options.deny.include).toContain('**/node_modules/lodash{,/**}')
      expect(options.deny.include).toContain(posix(nodePath.resolve(cwd, './src/local.ts')))
      expect(options.deny.include.some((rule) => rule instanceof RegExp)).toBe(true)
      expect(options.deny.exclude).toContain('**/node_modules/react{,/**}')
      expect(options.map.deny['**/node_modules/react{,/**}']).toBe('deps/package.json:react')
      expect(options.map.deny['**/node_modules/lodash{,/**}']).toBe('deps/package.json:lodash')
    })

    it('preserves include, exclude, include order for path globs', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const options = parseImporterOptions({
        cwd,
        mock: ['./my/dir/**', '!./my/dir/special/**', './my/dir/special/also-included/**'],
      })

      expect(options.mock.ordered).toEqual([
        { type: 'include', rule: posix(nodePath.resolve(cwd, './my/dir/**')) },
        { type: 'exclude', rule: posix(nodePath.resolve(cwd, './my/dir/special/**')) },
        { type: 'include', rule: posix(nodePath.resolve(cwd, './my/dir/special/also-included/**')) },
      ])
    })
  })

  describe('#resolveImporterRule', () => {
    it('returns shortened importer, path, and mapped rule', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const path = nodePath.join(cwd, 'node_modules', 'react', 'index.js')
      const importer = nodePath.join(cwd, 'src', 'page.tsx')
      const includeRule = '**/node_modules/react{,/**}'
      const result = resolveImporterRule({
        map: { [includeRule]: 'deps/package.json:react' },
        rules: {
          include: [includeRule],
          exclude: ['**/node_modules/react-dom{,/**}'],
          ordered: [
            { type: 'include', rule: includeRule },
            { type: 'exclude', rule: '**/node_modules/react-dom{,/**}' },
          ],
        },
        path,
        cwd,
        importer,
        loc: { line: 12, column: 8 },
      })

      expect(result).toEqual({
        // posix-normalized display paths on every OS (see toPosixPath in importer.ts).
        shortPath: 'node_modules/react/index.js',
        shortRule: 'deps/package.json:react',
        shortImporter: `src/page.tsx:12:8`,
      })
    })

    it('returns undefined when an exclude rule also matches', () => {
      const includeRule = '**/node_modules/react{,/**}'
      const result = resolveImporterRule({
        map: { [includeRule]: 'react' },
        rules: {
          include: [includeRule],
          exclude: [includeRule],
          ordered: [
            { type: 'include', rule: includeRule },
            { type: 'exclude', rule: includeRule },
          ],
        },
        path: '/repo/node_modules/react/index.js',
        cwd: '/repo',
        importer: '/repo/src/page.tsx',
        loc: { line: 1, column: 0 },
      })

      expect(result).toBeUndefined()
    })

    it('returns match when a later include re-includes after exclude', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const options = parseImporterOptions({
        cwd,
        mock: ['./my/dir/**', '!./my/dir/special/**', './my/dir/special/also-included/**'],
      })
      const path = nodePath.join(cwd, 'my/dir/special/also-included/file.ts')

      const result = resolveImporterRule({
        map: options.map.mock,
        rules: options.mock,
        path,
        cwd,
        importer: nodePath.join(cwd, 'src/page.tsx'),
        loc: { line: 5, column: 2 },
      })

      expect(result).toEqual({
        // `resolveImporterRule` emits posix-normalized display paths on every OS (see toPosixPath in importer.ts).
        shortPath: 'my/dir/special/also-included/file.ts',
        shortRule: './my/dir/special/also-included/**',
        shortImporter: `src/page.tsx:5:2`,
      })
    })

    it('returns undefined when excluded path is not re-included', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const options = parseImporterOptions({
        cwd,
        mock: ['./my/dir/**', '!./my/dir/special/**', './my/dir/special/also-included/**'],
      })
      const path = nodePath.join(cwd, 'my/dir/special/not-included/file.ts')

      const result = resolveImporterRule({
        map: options.map.mock,
        rules: options.mock,
        path,
        cwd,
        importer: nodePath.join(cwd, 'src/page.tsx'),
        loc: { line: 7, column: 1 },
      })

      expect(result).toBeUndefined()
    })
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { parseImporterOptions, resolveImporterRule } from '../src/importer.js'

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

      expect(options.mock.include).toEqual([nodePath.resolve(cwd, './src/local.ts')])
      expect(options.mock.exclude).toEqual([])
      expect(options.map.mock[nodePath.resolve(cwd, './src/local.ts')]).toBe('./src/local.ts')
    })

    it('normalizes negative relative pattern', () => {
      const cwd = nodePath.join(tempDir, crypto.randomUUID())
      const options = parseImporterOptions({
        cwd,
        mock: ['!./src/local.ts'],
      })

      expect(options.mock.include).toEqual([])
      expect(options.mock.exclude).toEqual([nodePath.resolve(cwd, './src/local.ts')])
      expect(options.map.mock[nodePath.resolve(cwd, './src/local.ts')]).toBeUndefined()
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
      expect(options.deny.include).toContain(nodePath.resolve(cwd, './src/local.ts'))
      expect(options.deny.include.some((rule) => rule instanceof RegExp)).toBe(true)
      expect(options.deny.exclude).toContain('**/node_modules/react{,/**}')
      expect(options.map.deny['**/node_modules/react{,/**}']).toBe('deps/package.json:react')
      expect(options.map.deny['**/node_modules/lodash{,/**}']).toBe('deps/package.json:lodash')
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
        },
        path,
        cwd,
        importer,
        loc: { line: 12, column: 8 },
      })

      expect(result).toEqual({
        shortPath: nodePath.join('node_modules', 'react', 'index.js'),
        shortRule: 'deps/package.json:react',
        shortImporter: `src${nodePath.sep}page.tsx:12:8`,
      })
    })

    it('returns undefined when an exclude rule also matches', () => {
      const includeRule = '**/node_modules/react{,/**}'
      const result = resolveImporterRule({
        map: { [includeRule]: 'react' },
        rules: {
          include: [includeRule],
          exclude: [includeRule],
        },
        path: '/repo/node_modules/react/index.js',
        cwd: '/repo',
        importer: '/repo/src/page.tsx',
        loc: { line: 1, column: 0 },
      })

      expect(result).toBeUndefined()
    })
  })
})

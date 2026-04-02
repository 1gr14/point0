import * as flat0 from '@devp0nt/flat0'
import { minimatch } from 'minimatch'
import nodePath from 'node:path'
import nodeFs from 'node:fs'
import { getHash } from './utils.js'

export type ImporterOptionsInput = {
  mock?: Array<string | RegExp>
  deny?: Array<string | RegExp>
  // path will be relative to it
  cwd?: string
  onDeny?: 'exit' | 'throw' | 'log'
}

export type ImporterOptionsParsed = {
  mock: { include: Array<RegExp | string>; exclude: Array<RegExp | string> }
  deny: { include: Array<RegExp | string>; exclude: Array<RegExp | string> }
  // full rule → short rule
  map: { mock: Record<string, string>; deny: Record<string, string> }
  cwd: string | undefined
  onDeny: 'exit' | 'throw' | 'log'
}

export const parseImporterOptions = (options: ImporterOptionsInput): ImporterOptionsParsed => {
  const cwd = options.cwd

  const parsePackageJson = ({
    packageJsonPath,
    cwd,
  }: {
    packageJsonPath: string
    cwd: string | undefined
  }): { modulesNames: string[] } => {
    const absPackageJsonPath = cwd ? nodePath.resolve(cwd, packageJsonPath) : packageJsonPath
    try {
      const packageJson = JSON.parse(nodeFs.readFileSync(absPackageJsonPath, 'utf8')) as unknown
      const moduleNames = new Set<string>()

      const collectModuleNamesFromRecord = (value: unknown): void => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return
        for (const moduleName of Object.keys(value as Record<string, unknown>)) {
          if (moduleName.length > 0) {
            moduleNames.add(moduleName)
          }
        }
      }

      const collectModuleNamesFromArray = (value: unknown): void => {
        if (!Array.isArray(value)) return
        for (const moduleName of value) {
          if (typeof moduleName === 'string' && moduleName.length > 0) {
            moduleNames.add(moduleName)
          }
        }
      }

      if (packageJson && typeof packageJson === 'object' && !Array.isArray(packageJson)) {
        const packageJsonRecord = packageJson as Record<string, unknown>
        collectModuleNamesFromRecord(packageJsonRecord.dependencies)
        collectModuleNamesFromRecord(packageJsonRecord.devDependencies)
        collectModuleNamesFromRecord(packageJsonRecord.peerDependencies)
        collectModuleNamesFromRecord(packageJsonRecord.optionalDependencies)
        collectModuleNamesFromRecord(packageJsonRecord.bundleDependencies)
        collectModuleNamesFromRecord(packageJsonRecord.bundledDependencies)
        collectModuleNamesFromArray(packageJsonRecord.bundleDependencies)
        collectModuleNamesFromArray(packageJsonRecord.bundledDependencies)
      }

      return { modulesNames: Array.from(moduleNames) }
    } catch (e) {
      throw new Error(
        `Failed to init compiler, error parsing package.json at ${absPackageJsonPath}: ${e instanceof Error ? e.message : String(e)}`,
      )
    }
  }

  const resolvePattern = (pattern: string | RegExp): { short: string; full: string } => {
    if (typeof pattern === 'string') {
      if (nodePath.isAbsolute(pattern)) {
        return {
          short: pattern,
          full: pattern,
        }
      }
      if (pattern.startsWith('*')) {
        return {
          short: pattern,
          full: pattern,
        }
      }
      if (!pattern.startsWith('.')) {
        return {
          short: pattern,
          full: `**/node_modules/${pattern}{,/**}`,
        }
      }
      if (!cwd) {
        return {
          short: pattern,
          full: pattern,
        }
      }
      return {
        short: pattern,
        full: nodePath.resolve(cwd, pattern),
      }
    }
    return {
      short: pattern.toString(),
      full: pattern.toString(),
    }
  }

  const map: { mock: Record<string, string>; deny: Record<string, string> } = { mock: {}, deny: {} }
  const normalizePatterns = (
    patterns: Array<string | RegExp> | undefined,
    type: 'mock' | 'deny',
  ): {
    include: Array<RegExp | string>
    exclude: Array<RegExp | string>
  } => {
    const include: Array<RegExp | string> = []
    const exclude: Array<RegExp | string> = []
    if (!patterns) return { include, exclude }
    for (const pattern of patterns) {
      const hasExclamationMark = typeof pattern === 'string' && pattern.startsWith('!')
      const patternWithoutExclamationMark = hasExclamationMark ? pattern.slice(1) : pattern
      if (typeof patternWithoutExclamationMark === 'string' && patternWithoutExclamationMark.endsWith('package.json')) {
        const packageJsonPath = patternWithoutExclamationMark
        const packageJson = parsePackageJson({ packageJsonPath, cwd })
        // const normalized = normalizePatterns(packageJson.modulesNames, type)
        // include.push(...normalized.include)
        // exclude.push(...normalized.exclude)
        for (const moduleName of packageJson.modulesNames) {
          const { short, full } = resolvePattern(moduleName)
          if (hasExclamationMark) {
            exclude.push(full)
          } else {
            map[type][full] = `${packageJsonPath}:${short}`
            include.push(full)
          }
        }
      } else {
        const { short, full } = resolvePattern(patternWithoutExclamationMark)
        if (typeof pattern === 'string') {
          if (hasExclamationMark) {
            exclude.push(full)
          } else {
            map[type][full] = short
            include.push(full)
          }
        } else {
          // we pass here original regex
          map[type][full] = short
          include.push(pattern)
        }
      }
    }
    return { include, exclude }
  }

  return {
    mock: normalizePatterns(options.mock, 'mock'),
    deny: normalizePatterns(options.deny, 'deny'),
    map,
    onDeny: options.onDeny ?? 'log',
    cwd,
  }
}

export type ResolvedImporterRule = { shortPath: string; shortRule: string; shortImporters: string[] }
export const resolveImporterRule = ({
  map,
  rules,
  path,
  cwd,
  importers,
  loc,
}: {
  map: Record<string, string>
  rules: { include: Array<string | RegExp>; exclude: Array<string | RegExp> }
  path: string
  cwd: string | undefined
  importers: string[]
  loc: { line: number; column: number } | undefined
}): ResolvedImporterRule | undefined => {
  const isMatch = (rule: string | RegExp): boolean => {
    if (typeof rule === 'string') {
      return minimatch(path, rule)
    }
    return rule.test(path)
  }
  const matchIncludeRule = rules.include.find(isMatch)
  if (!matchIncludeRule) return undefined
  const matchExcludeRule = rules.exclude.find(isMatch)
  if (matchExcludeRule) return undefined
  const fullRuleString = matchIncludeRule.toString()
  const shortRuleString = map[fullRuleString] as string | undefined
  const shortPath = cwd ? nodePath.relative(cwd, path) : path
  const locString = loc ? `:${loc.line}:${loc.column}` : ''
  const shortImporters = importers.map((importer) => `${cwd ? nodePath.relative(cwd, importer) : importer}${locString}`)
  return { shortPath, shortRule: shortRuleString ?? fullRuleString, shortImporters }
}

export type VirtualModuleOptions =
  | {
      exportNames: string[]
      importers: string[]
      pathOriginal: string
      pathResolved: string
      scope: string | undefined
      side: 'client' | 'server'
      deny: string
    }
  | {
      exportNames: string[]
      importers: undefined
      pathOriginal: undefined
      pathResolved: undefined
      scope: string | undefined
      side: 'client' | 'server'
      deny: undefined
    }

export const createVirtualModuleCode = ({
  exportNames,
  importers,
  pathOriginal,
  pathResolved,
  scope,
  side,
  deny,
}: VirtualModuleOptions): { code: string; error: string | undefined } => {
  // Inspired by TanStack Router's virtualModules.ts
  // https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/import-protection-plugin/virtualModules.ts
  // Thanks a lot to the TanStack team for their work! And thanks forever for react-query
  const denyMessage = !deny
    ? undefined
    : `
Import denied on side "${side}"${scope ? ` for scope "${scope}"` : ''}
  Rule: ${deny}
  Importer: ${importers.join(' ← ')}
  Import: ${pathOriginal}
  Resolved: ${pathResolved}

  To know trace of imports from "${pathOriginal}" to <dest-file-path> run in terminal:
  point0 trace --side ${side} --scope ${scope || '<scope>'} "${pathResolved}" "<dest-file-path>"
  `
  const denyAtModuleStart = denyMessage ? `throw new Error(${JSON.stringify(denyMessage)})` : undefined

  const validExportNames = exportNames.filter((name) => name.length > 0 && name !== 'default')

  const exportLines: string[] = []
  const stringExports: Array<{ alias: string; name: string }> = []
  const identifierRe = /^[$A-Z_][0-9A-Z_$]*$/i

  for (let i = 0; i < validExportNames.length; i++) {
    const name = validExportNames[i]!
    if (identifierRe.test(name)) {
      exportLines.push(`export const ${name} = mock.${name};`)
    } else {
      const alias = `__mock_str_${i}`
      exportLines.push(`const ${alias} = mock[${JSON.stringify(name)}];`)
      stringExports.push({ alias, name })
    }
  }

  if (stringExports.length > 0) {
    const reexports = stringExports.map((entry) => `${entry.alias} as ${JSON.stringify(entry.name)}`).join(', ')
    exportLines.push(`export { ${reexports} };`)
  }

  const code = `
${denyAtModuleStart ?? ''}
import { createMock } from '@point0/core/virtual'
const mock = createMock()
${exportLines.join('\n')}
export default mock
`.trim()

  return { code, error: denyMessage }
}

export const writeVirtualModulePath = (options: VirtualModuleOptions, tempDir: string): string => {
  const hash = getHash(JSON.stringify(options))
  const filePath = nodePath.join(tempDir, hash + '.js')
  if (!nodeFs.existsSync(filePath)) {
    const { code } = createVirtualModuleCode(options)
    nodeFs.writeFileSync(filePath, code)
  }
  return filePath
}

export const createVirtualModulePath = (options: VirtualModuleOptions): string => {
  return `@point0/virtual?options=${encodeURIComponent(JSON.stringify(options))}`
}

export const writeOrCreateVirtualModulePath = (options: VirtualModuleOptions, writeVirtual: string | false): string => {
  if (writeVirtual) {
    return writeVirtualModulePath(options, writeVirtual)
  }
  return createVirtualModulePath(options)
}

export const parseVirtualModulePath = (path: string): VirtualModuleOptions => {
  return JSON.parse(decodeURIComponent(path.split('@point0/virtual?options=')[1])) as VirtualModuleOptions
}

export const virtualModulePathRegex = /^@point0\/virtual\?/

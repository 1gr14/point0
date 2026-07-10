import { minimatch } from 'minimatch'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX, virtualModulePathRegex } from './protocol.js'
import { getHash, toPosixPath } from './utils.js'

export type ImporterOptionsInput = {
  // `mock` + `deny` are COMPILE-TIME import rules: they match an import's TARGET specifier and rewrite/forbid it in
  // EVERY mode (dev, build, prod), changing the emitted code. `cold` below is a different beast — read its note for the
  // contrast (it's the one field here that's dev-hot-reload-only and matches the file's own path, not import targets).
  mock?: Array<string | RegExp>
  deny?: Array<string | RegExp>
  // `cold` is DEV-HOT-RELOAD ONLY: it has NO effect on builds, prod, or non-hot dev — it is read solely when building
  // the server hot-reload store (`point0 dev --hot`). A file whose OWN path matches one of these globs/regexes (NOT the
  // import target, unlike `deny`/`mock`) — together with its downward static-import subtree — is externalized from the
  // hot graph: editing it RESTARTS the server child instead of hot-swapping. The config-side equivalent of the in-file
  // `import '@point0/core/cold'` marker, for files you can't (or don't want to) edit; same glob style as `deny`. Only
  // meaningful on `server.importer` (a client has no server dev store) — a cold rule anywhere else is a silent no-op.
  cold?: Array<string | RegExp>
  // path will be relative to it
  cwd?: string
  onDeny?: 'throw' | 'log'
}

export type ImporterOptionsParsed = {
  mock: {
    include: Array<RegExp | string>
    exclude: Array<RegExp | string>
    ordered: Array<{ type: 'include' | 'exclude'; rule: RegExp | string }>
  }
  deny: {
    include: Array<RegExp | string>
    exclude: Array<RegExp | string>
    ordered: Array<{ type: 'include' | 'exclude'; rule: RegExp | string }>
  }
  cold: {
    include: Array<RegExp | string>
    exclude: Array<RegExp | string>
    ordered: Array<{ type: 'include' | 'exclude'; rule: RegExp | string }>
  }
  // full rule → short rule
  map: { mock: Record<string, string>; deny: Record<string, string>; cold: Record<string, string> }
  cwd: string | undefined
  onDeny: 'throw' | 'log'
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
          // posix the glob so an absolute native pattern still matches the posix path.
          full: toPosixPath(pattern),
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
        // `full` is a minimatch glob (and the short-form map key), so posix it — `nodePath.resolve` emits `\` on Windows.
        full: toPosixPath(nodePath.resolve(cwd, pattern)),
      }
    }
    return {
      short: pattern.toString(),
      full: pattern.toString(),
    }
  }

  const map: { mock: Record<string, string>; deny: Record<string, string>; cold: Record<string, string> } = {
    mock: {},
    deny: {},
    cold: {},
  }
  const normalizePatterns = (
    patterns: Array<string | RegExp> | undefined,
    type: 'mock' | 'deny' | 'cold',
  ): {
    include: Array<RegExp | string>
    exclude: Array<RegExp | string>
    ordered: Array<{ type: 'include' | 'exclude'; rule: RegExp | string }>
  } => {
    const include: Array<RegExp | string> = []
    const exclude: Array<RegExp | string> = []
    const ordered: Array<{ type: 'include' | 'exclude'; rule: RegExp | string }> = []
    if (!patterns) return { include, exclude, ordered }
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
            ordered.push({ type: 'exclude', rule: full })
          } else {
            map[type][full] = `${packageJsonPath}:${short}`
            include.push(full)
            ordered.push({ type: 'include', rule: full })
          }
        }
      } else {
        const { short, full } = resolvePattern(patternWithoutExclamationMark)
        if (typeof pattern === 'string') {
          if (hasExclamationMark) {
            exclude.push(full)
            ordered.push({ type: 'exclude', rule: full })
          } else {
            map[type][full] = short
            include.push(full)
            ordered.push({ type: 'include', rule: full })
          }
        } else {
          // we pass here original regex
          map[type][full] = short
          include.push(pattern)
          ordered.push({ type: 'include', rule: pattern })
        }
      }
    }
    return { include, exclude, ordered }
  }

  return {
    mock: normalizePatterns(options.mock, 'mock'),
    deny: normalizePatterns(options.deny, 'deny'),
    cold: normalizePatterns(options.cold, 'cold'),
    map,
    onDeny: options.onDeny ?? 'log',
    cwd,
  }
}

/**
 * Whether `path` is COLD per the importer's `cold` rules (include minus exclude, applied in declared order — same
 * semantics as `resolveImporterRule`). Used by the server dev store to classify a file as a restart-trigger.
 */
export const isImporterColdPath = ({ path, importer }: { path: string; importer: ImporterOptionsParsed }): boolean => {
  let cold = false
  for (const { type, rule } of importer.cold.ordered) {
    const isMatch = typeof rule === 'string' ? minimatch(path, rule) : rule.test(path)
    if (isMatch) {
      cold = type === 'include'
    }
  }
  return cold
}

export type ResolvedImporterRule = { shortPath: string; shortRule: string; shortImporter: string }
export const resolveImporterRule = ({
  map,
  rules,
  path,
  cwd,
  importer,
  loc,
}: {
  map: Record<string, string>
  rules: {
    include: Array<string | RegExp>
    exclude: Array<string | RegExp>
    ordered: Array<{ type: 'include' | 'exclude'; rule: RegExp | string }>
  }
  path: string
  cwd: string | undefined
  importer: string
  loc: { line: number; column: number } | undefined
}): ResolvedImporterRule | undefined => {
  // Import rules (globs/regexes) are authored posix, so normalize the path before matching — a Windows `\` path would
  // never match a `/` glob and every rule would silently miss.
  const posixPath = toPosixPath(path)
  const isMatch = (rule: string | RegExp): boolean => {
    if (typeof rule === 'string') {
      return minimatch(posixPath, rule)
    }
    return rule.test(posixPath)
  }
  const matchIncludeRule = (() => {
    let foundIncludeRule = undefined as string | RegExp | undefined
    for (const { type, rule } of rules.ordered) {
      if (isMatch(rule)) {
        if (type === 'include') {
          foundIncludeRule = rule
        } else {
          foundIncludeRule = undefined
        }
      }
    }
    return foundIncludeRule
  })()
  if (!matchIncludeRule) {
    return undefined
  }
  const fullRuleString = matchIncludeRule.toString()
  const shortRuleString = map[fullRuleString] as string | undefined
  // Posix-normalize display paths: they go into virtual-module ids and diagnostics, which must match across OSes.
  const shortPath = toPosixPath(cwd ? nodePath.relative(cwd, path) : path)
  const locString = loc ? `:${loc.line}:${loc.column}` : ''
  const shortImporter = `${toPosixPath(cwd ? nodePath.relative(cwd, importer) : importer)}${locString}`
  return { shortPath, shortRule: shortRuleString ?? fullRuleString, shortImporter }
}

export type VirtualModuleOptions =
  | {
      exportNames: string[]
      importer: string
      pathOriginal: string
      pathResolved: string
      scope: string | undefined
      side: 'client' | 'server'
      deny: string
      trace: string[] | undefined
    }
  | {
      exportNames: string[]
      importer: undefined
      pathOriginal: undefined
      pathResolved: undefined
      scope: string | undefined
      side: 'client' | 'server'
      deny: undefined
      trace: undefined
    }

// Format a path/specifier as a CLI argument for `point0 trace`/`point0 compile`.
//
// The CLI accepts both bare specifiers (`@point0/core/client-only`, `lodash/fp`) and file
// paths. For relative file paths without an explicit `./` prefix (the shape produced by
// `nodePath.relative(cwd, abs)` — e.g. `src/lib/prisma.ts`), we add `./` so the shell
// quoting + the CLI's path detection both behave. For everything else (absolute paths,
// already-prefixed relative paths, scoped packages) we leave it alone — adding `./` to
// `@point0/core/client-only` would yield `./@point0/...` which breaks both the trace lookup
// (it matches against `pathOriginal === '@point0/core/client-only'`) and is just wrong-looking.
const formatPathForCliArg = (path: string): string => {
  if (nodePath.isAbsolute(path)) return path
  if (path.startsWith('./') || path.startsWith('../')) return path
  // Scoped package specifier (always starts with `@`).
  if (path.startsWith('@')) return path
  // Everything else looks like a relative file path produced by `nodePath.relative`.
  return `./${path}`
}

export const createVirtualModuleCode = ({
  exportNames,
  importer,
  pathOriginal,
  pathResolved,
  scope,
  side,
  deny,
  trace,
}: VirtualModuleOptions): { code: string; error: string | undefined } => {
  // Inspired by TanStack Router's virtualModules.ts
  // https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/import-protection-plugin/virtualModules.ts
  // Thanks a lot to the TanStack team for their work! And thanks forever for react-query
  const { denyMessage, denyThrower } = (() => {
    if (!deny) {
      return { denyMessage: undefined, denyThrower: '' }
    }
    const cliPathArg = formatPathForCliArg(pathResolved)
    const traceMessage = trace
      ? `Trace:
${trace.map((item) => `  ${item}`).join('\n')}`
      : `To know trace of imports to target "${pathOriginal}" from source <source-file-path> run in terminal:
point0 trace --side ${side} --scope ${scope || '<scope>'} "${cliPathArg}" "<source-file-path>"`
    const denyMessage = `
Import denied on side "${side}"${scope ? ` for scope "${scope}"` : ''}
  Rule: ${deny}
  Importer: ${importer}
  Import: ${pathOriginal}
  Resolved: ${pathResolved}

${traceMessage}

Suggestions:${!trace ? '' : `\n  - To see better trace run in terminal: point0 trace --side ${side} --scope ${scope || '<scope>'} "${cliPathArg}" "<source-file-path>"`}
  - To see how <source-file-path> looks after compiling without ${side === 'server' ? 'client' : 'server'} code, run in terminal: point0 compile --side ${side} --scope ${scope || '<scope>'} "<source-file-path>"
  `
    const denyThrower = `throw new Error(${JSON.stringify(denyMessage)})`
    return { denyMessage, denyThrower }
  })()

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

  const code = `${denyThrower}
import { createMock } from '@point0/core/virtual'
const mock = createMock()
${exportLines.join('\n')}
export default mock
`.trim()

  return { code, error: denyMessage }
}

export const writeVirtualModulePath = (options: VirtualModuleOptions, { tempDir }: { tempDir: string }): string => {
  const hash = getHash(JSON.stringify(options))
  const filePath = nodePath.join(tempDir, hash + '.js')
  if (!nodeFs.existsSync(filePath)) {
    const { code } = createVirtualModuleCode(options)
    nodeFs.writeFileSync(filePath, code)
  }
  return filePath
}

export const createVirtualModulePath = (options: VirtualModuleOptions): string => {
  return `${POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX}${encodeURIComponent(JSON.stringify(options))}`
}

export const writeOrCreateVirtualModulePath = (
  options: VirtualModuleOptions,
  { writeVirtual }: { writeVirtual: string | false },
): string => {
  if (writeVirtual) {
    return writeVirtualModulePath(options, { tempDir: writeVirtual })
  }
  return createVirtualModulePath(options)
}

export const parseVirtualModulePath = (path: string): VirtualModuleOptions => {
  return JSON.parse(decodeURIComponent(path.split(POINT0_VIRTUAL_MODULE_OPTIONS_PREFIX)[1])) as VirtualModuleOptions
}

// Lives in `protocol.ts` with the rest of the virtual-module vocabulary; re-exported here because that is where the
// plugins have always imported it from.
export { virtualModulePathRegex }

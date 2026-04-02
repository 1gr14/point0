import * as flat0 from '@devp0nt/flat0'

export type ImporterOptionsInput = {
  mock?: Array<string | RegExp>
  deny?: Array<string | RegExp>
  exitOnDeny?: boolean
}

export type ImporterOptionsParsed = {
  mock: Array<RegExp | string>
  deny: Array<RegExp | string>
  exitOnDeny?: boolean
}

export const parseImporterOptions = (options: ImporterOptionsInput): ImporterOptionsParsed => {
  return {
    mock: options.mock ?? [],
    deny: options.deny ?? [],
    exitOnDeny: options.exitOnDeny,
  }
}

export type VirtualModuleOptions = {
  exportNames: string[]
  importer: string
  pathOriginal: string
  pathResolved: string
  scope: string | undefined
  side: 'client' | 'server'
  deny: string | undefined
}

// // Inspired by TanStack Router's virtualModules.ts
// // https://github.com/TanStack/router/blob/main/packages/start-plugin-core/src/import-protection-plugin/virtualModules.ts
// // Thanks a lot to the TanStack team for their work! And thanks forever for react-query
export const createVirtualModuleCode = ({
  exportNames,
  importer,
  pathOriginal,
  pathResolved,
  scope,
  side,
  deny,
}: VirtualModuleOptions): { code: string; error: string | undefined } => {
  const denyMessage = !deny
    ? undefined
    : `
Import denied on side "${side}"${scope ? ` for scope "${scope}"` : ''}
  Rule: ${deny}
  Importer: "${importer}"
  Import: "${pathResolved}"
  Resolved: "${pathOriginal}"

  To know how this file come to your code run in terminal:
  point0 why --side ${side} --scope ${scope || '<scope>'} --to <src-file> "${pathOriginal}"
  
  and then you will see trace from imported path to <src-file>
  you can omit --to <src-file>, then to will be equal to first entrypoint, it is ok for server, but for client you should specify page file as <src-file>
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
function createMock(path = 'mock') {
  const fn = () => {}

  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === '__esModule') return true
      if (prop === 'default') return createMock(path)
      if (prop === 'caller') return null
      if (prop === 'then') return (resolve) => Promise.resolve(resolve(createMock(path)))
      if (prop === 'catch') return () => Promise.resolve(createMock(path))
      if (prop === 'finally')
        return (f) => {
          f()
          return Promise.resolve(createMock(path))
        }
      if (typeof prop === 'symbol') return undefined
      return createMock(\`\${path}.\${String(prop)}\`)
    },
    apply() {
      return createMock(\`\${path}()\`)
    },
    construct() {
      return createMock(\`new \${path}\`)
    },
    set() {
      return true
    },
  })
}

const mock = createMock()
${exportLines.join('\n')}
export default mock
`.trim()

  return { code, error: denyMessage }
}

export const createVirtualModulePath = (options: VirtualModuleOptions): string => {
  return `@point0/virtual?${flat0.stringify(options)}`
}

export const parseVirtualModulePath = (path: string): VirtualModuleOptions => {
  return flat0.parse(path.replace('@point0/virtual?', '')) as VirtualModuleOptions
}

export const virtualModulePathRegex = /^@point0\/virtual\?/

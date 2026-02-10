import generatorModule from '@babel/generator'
import babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import type { Node, File } from '@babel/types'
import traverseModule from '@babel/traverse'
import * as nodeFs from 'node:fs/promises'
import * as nodeFsSync from 'node:fs'
import prettier from 'prettier'
import { normalizeEnvConsts, type CompilerEnvConsts } from './utils.js'
import type { Walker } from './walker.js'
import type { CompilerPoint } from './point.js'
import type { NormalNodeEnv } from '@point0/core'

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

const babelGenerator = ((generatorModule as any).default ?? generatorModule) as typeof generatorModule extends {
  default: infer T
}
  ? T
  : typeof generatorModule

export class CompilerFile<THasContent extends boolean> {
  readonly abs: string
  content: THasContent extends true ? string : undefined
  mtime: THasContent extends true ? number : undefined
  rtime: THasContent extends true ? number : undefined
  modified: boolean
  walker: Walker
  points: Set<CompilerPoint>
  allPointsWasCollected: boolean
  stale: boolean

  private constructor({
    abs,
    content,
    mtime,
    rtime,
    modified,
    walker,
    points,
    allPointsWasCollected,
    stale,
  }: {
    abs: string
    content: string | undefined
    mtime: number | undefined
    rtime: number | undefined
    modified: boolean
    walker: Walker
    points: Set<CompilerPoint>
    allPointsWasCollected: boolean
    stale: boolean
  }) {
    this.abs = abs
    this.content = content as THasContent extends true ? string : undefined
    this.mtime = mtime as THasContent extends true ? number : undefined
    this.rtime = rtime as THasContent extends true ? number : undefined
    this.modified = modified
    this.walker = walker
    this.points = points
    this.allPointsWasCollected = allPointsWasCollected
    this.stale = stale
  }

  static create<TContent extends string | undefined = undefined>({
    walker,
    file,
    content,
  }: {
    walker: Walker
    file: string
    content?: TContent
  }): CompilerFile<TContent extends string ? true : false> {
    const exCf = walker.files.get(file)
    const contentProvided = typeof content !== 'undefined'
    if (exCf && !contentProvided) {
      return exCf
    }
    const cf = new CompilerFile({
      abs: file,
      content,
      mtime: contentProvided ? 0 : undefined,
      rtime: new Date().getTime(),
      modified: false,
      walker,
      points: new Set(),
      allPointsWasCollected: false,
      stale: false,
    })
    if (contentProvided) {
      // if content was provided, then it is not real content of file, so we do not want to cache this file, we want rerad it if another point needs it
      walker.files.set(file, cf)
    }
    return cf
  }

  cloneAndMadeStale() {
    const cloned = new CompilerFile({
      abs: this.abs,
      content: this.content,
      mtime: this.mtime,
      rtime: this.rtime,
      modified: this.modified,
      walker: this.walker,
      points: this.points,
      allPointsWasCollected: this.allPointsWasCollected,
      stale: true,
    })
    cloned._parse = this._parse
    cloned._mayContainPoints = this._mayContainPoints
    cloned._isIdentifierExists = this._isIdentifierExists
    cloned._shakeForEnv = this._shakeForEnv
    return cloned
  }

  private pruneMemory() {
    const clonedAndStale = this.cloneAndMadeStale()
    for (const point of this.points.values()) {
      // point.pruneMemory()
      point.file = clonedAndStale
    }
    this.points = new Set()
    this._parse = undefined
    this._mayContainPoints = undefined
    this._isIdentifierExists = {}
    this._shakeForEnv = undefined
    this.allPointsWasCollected = false
    this.modified = false
  }

  addPointToMemory(point: CompilerPoint) {
    this.points.add(point)
  }

  getPointFormMemoryByLetsNodePath(letsNodePath: NodePath<Node>): CompilerPoint | undefined {
    for (const point of this.points.values()) {
      if (point.letsNodePath === letsNodePath) {
        return point
      }
    }
    return undefined
  }

  getCollectedPoints(): CompilerPoint[] {
    return [...this.points.values()]
  }

  static async readAsync({
    walker,
    file,
    fresh,
  }: {
    walker: Walker
    file: string
    fresh: boolean
  }): Promise<CompilerFile<true>> {
    return await CompilerFile.create({ walker, file }).readAsync(fresh)
  }

  static readSync({ walker, file, fresh }: { walker: Walker; file: string; fresh: boolean }): CompilerFile<true> {
    return CompilerFile.create({ walker, file }).readSync(fresh)
  }

  hasContent(): this is CompilerFile<true> {
    return !!this.content
  }

  isParsed() {
    return !!this.ast
  }

  assertHasContent(): asserts this is CompilerFile<true> {
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
  }

  private async _readAsync(fresh: boolean): Promise<CompilerFile<true>> {
    if (this.content && !fresh) {
      return this as CompilerFile<true>
    }
    const stats = await (async () => {
      try {
        return await nodeFs.stat(this.abs)
      } catch (e) {
        throw new Error(`Failed to read file ${this.abs}: ${(e as Error).message}`, { cause: e })
      }
    })()
    if (stats.mtimeMs === this.mtime && this.content) {
      return this as CompilerFile<true>
    }
    // const cf = new CompilerFile({
    //   abs: this.abs,
    //   content: await nodeFs.readFile(this.abs, 'utf8'),
    //   mtime: stats.mtimeMs,
    //   rtime: new Date().getTime(),
    //   walker: this.walker,
    // })
    // this.walker.files.set(this.abs, cf)
    // return cf
    this.pruneMemory()
    const result = this as CompilerFile<true>
    result.content = await nodeFs.readFile(this.abs, 'utf8')
    result.mtime = stats.mtimeMs
    result.rtime = new Date().getTime()
    return result
  }
  private readonly _readAsyncPendingPromises = new Map<string, Promise<CompilerFile<true>>>()
  async readAsync(fresh: boolean): Promise<CompilerFile<true>> {
    const pendingPromise = this._readAsyncPendingPromises.get(this.abs)
    if (pendingPromise) {
      return await pendingPromise
    }
    const newPromise = this._readAsync(fresh).then((cf) => {
      this._readAsyncPendingPromises.delete(this.abs)
      return cf
    })
    this._readAsyncPendingPromises.set(this.abs, newPromise)
    return await newPromise
  }

  readSync(fresh: boolean): CompilerFile<true> {
    if (this.content && !fresh) {
      return this as CompilerFile<true>
    }
    const stats = nodeFsSync.statSync(this.abs)
    if (stats.mtimeMs === this.mtime && this.content) {
      return this as CompilerFile<true>
    }
    // const cf = new CompilerFile({
    //   abs: this.abs,
    //   content: nodeFsSync.readFileSync(this.abs, 'utf8'),
    //   mtime: stats.mtimeMs,
    //   rtime: new Date().getTime(),
    //   walker: this.walker,
    // })
    // this.walker.files.set(this.abs, cf)
    this.pruneMemory()
    const result = this as CompilerFile<true>
    result.content = nodeFsSync.readFileSync(this.abs, 'utf8')
    result.mtime = stats.mtimeMs
    result.rtime = new Date().getTime()
    return result
  }

  _parse:
    | { ast: babel.ParseResult<File>; errors: unknown[]; ok: true }
    | { ast: undefined; errors: unknown[]; ok: false }
    | undefined = undefined
  parse():
    | { ast: babel.ParseResult<File>; errors: unknown[]; ok: true }
    | { ast: undefined; errors: unknown[]; ok: false } {
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._parse) {
      return this._parse
    }
    const errors: unknown[] = []
    try {
      const ast = babel.parse(this.content, {
        sourceType: 'module',
        errorRecovery: true,
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
        ],
      })
      this._parse = { ast, errors, ok: true }
      return this._parse
    } catch (e) {
      errors.push(e)
      this._parse = { ast: undefined, errors, ok: false }
      return this._parse
    }
  }

  get ast(): babel.ParseResult<File> {
    const parseResult = this.parse()
    if (!parseResult.ok) {
      const error = (parseResult.errors.at(0) || new Error('Failed to parse file')) as Error
      throw error
    }
    return parseResult.ast
  }

  private _mayContainPoints: boolean | undefined = undefined
  mayContainPoints(): boolean {
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._mayContainPoints !== undefined) {
      return this._mayContainPoints
    }
    const content = this.content
    const token = '.lets'
    let mayContainPoints = false

    let i = content.indexOf(token)
    while (i !== -1) {
      let j = i + token.length
      while (j < content.length) {
        const char = content.charCodeAt(j)
        // Skip common whitespace: space, tab, newline, carriage return.
        if (char === 32 || char === 9 || char === 10 || char === 13) {
          j++
          continue
        }
        // Accept `.lets(` and `.lets<...>` without allocating extra strings.
        // 40 === '(' and 60 === '<' (charCode values).
        if (char === 40 || char === 60) {
          mayContainPoints = true
        }
        // Stop at first non-whitespace char after `.lets`.
        break
      }
      if (mayContainPoints) {
        break
      }
      i = content.indexOf(token, i + 1)
    }

    this._mayContainPoints = mayContainPoints
    return this._mayContainPoints
  }

  private _isIdentifierExists: Record<string, boolean> = {}
  isIdentifierExists(name: string): boolean {
    if (name in this._isIdentifierExists) {
      return this._isIdentifierExists[name]
    }
    let exists = false
    traverse(this.ast, {
      Identifier: (path) => {
        if (path.node.name === name) {
          exists = true
          path.stop()
        }
      },
    })
    this._isIdentifierExists[name] = exists
    return exists
  }

  toCode(): string {
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    const { code } = babelGenerator(this.ast, { retainLines: true })
    return code
  }

  async toPrettyCode(): Promise<string> {
    const code = this.toCode()
    return await prettier.format(code, {
      parser: 'babel',
      semi: false,
      singleQuote: true,
      trailingComma: 'all',
    })
  }

  async toCompressedPrettyCode(): Promise<string> {
    const prettyCode = await this.toPrettyCode()
    return prettyCode.replace(/\n{2,}/g, '\n')
  }

  private _shakeForEnv:
    | {
        target: 'client' | 'server' | false
        mode: NormalNodeEnv | false
        built: boolean
        scope: string | false
        // can be env name like NODE_ENV, or string SOMETHING_* then we should force value for all const started with SOMETHING_
        // also object like { NODE_ENV: 'production', NUM: 1, BOOL: true, NULL: null, UNDEFINED: undefined } can be provided
        consts: CompilerEnvConsts
        errors: unknown[]
        ok: boolean
        modified: boolean
      }
    | undefined = undefined
  shakeForEnv({
    target,
    scope,
    consts = undefined,
    built = false,
    mode,
  }: {
    target: 'client' | 'server' | false
    scope: string | false
    mode: NormalNodeEnv | false
    consts?: CompilerEnvConsts | undefined
    built?: boolean | undefined
  }): {
    target: 'client' | 'server' | false
    built: boolean
    scope: string | false
    mode: NormalNodeEnv | false
    consts: CompilerEnvConsts
    errors: unknown[]
    ok: boolean
    modified: boolean
  } {
    const errors: unknown[] = []
    consts = normalizeEnvConsts(consts)
    consts = [...consts].reverse() // for winning last match
    if (mode !== false) {
      consts.unshift({ NODE_ENV: mode })
    }
    if (scope !== false) {
      consts.unshift({ POINT0_SCOPE: scope })
    }
    if (target !== false) {
      consts.unshift({ Target: target })
    }
    let modified = false
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._shakeForEnv) {
      if (target !== false && this._shakeForEnv.target !== target) {
        throw new Error(`Already shaked for target ${this._shakeForEnv.target}`)
      }
      if (scope !== false && this._shakeForEnv.scope !== scope) {
        throw new Error(`Already shaked for scope ${this._shakeForEnv.scope}`)
      }
      if (mode !== false && this._shakeForEnv.mode !== mode) {
        throw new Error(`Already shaked for mode ${this._shakeForEnv.mode}`)
      }
      return this._shakeForEnv
    }
    try {
      if (!this.content.includes('@point0/core') && !this.content.includes('_point0_env')) {
        const resultTarget = target !== false ? target : 'client'
        const resultScope = scope !== false ? scope : ''
        this._shakeForEnv = {
          target: resultTarget,
          scope: resultScope,
          mode,
          consts,
          built,
          errors,
          ok: true,
          modified,
        }
        return this._shakeForEnv
      }

      const makeUndefined = () =>
        ({
          type: 'Identifier',
          name: 'undefined',
        }) as any

      const makeStringLiteral = (value: string) =>
        ({
          type: 'StringLiteral',
          value,
        }) as any

      const makeBooleanLiteral = (value: boolean) =>
        ({
          type: 'BooleanLiteral',
          value,
        }) as any

      const makeNumericLiteral = (value: number) =>
        ({
          type: 'NumericLiteral',
          value,
        }) as any

      const makeNullLiteral = () =>
        ({
          type: 'NullLiteral',
        }) as any

      const checkReplaceVar = (
        varName: string,
        processEnvValue: string | number | boolean | null | undefined,
      ): { desiredValue: string | number | boolean | null | undefined; shouldReplace: boolean } => {
        for (const constPattern of consts) {
          if (typeof constPattern === 'string') {
            if (constPattern.endsWith('*')) {
              const prefix = constPattern.slice(0, -1)
              if (varName.startsWith(prefix)) {
                return { desiredValue: processEnvValue, shouldReplace: true }
              }
            } else if (varName === constPattern) {
              return { desiredValue: processEnvValue, shouldReplace: true }
            }
          }
          if (typeof constPattern === 'object') {
            if (varName in constPattern) {
              const desiredValue = constPattern[varName]
              return { desiredValue, shouldReplace: true }
            }
          }
        }
        return { desiredValue: undefined, shouldReplace: false }
      }

      // Get NODE_ENV value from process.env
      const isProduction = mode !== false && mode === 'production'
      const isDevelopment = mode !== false && mode === 'development'
      const isTest = mode !== false && mode === 'test'

      traverse(this.ast, {
        MemberExpression: (p) => {
          const node = p.node

          // Handle env.target.is.client, env.target.is.server
          if (
            target !== false &&
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'MemberExpression' &&
            node.object.object.object.type === 'Identifier' &&
            (node.object.object.object.name === 'env' || node.object.object.object.name === '_point0_env') &&
            node.object.object.property.type === 'Identifier' &&
            node.object.object.property.name === 'target' &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'is'
          ) {
            if (node.property.type === 'Identifier') {
              const name = node.property.name
              if (name === 'client') {
                p.replaceWith(makeBooleanLiteral(target === 'client'))
                modified = true
              } else if (name === 'server') {
                p.replaceWith(makeBooleanLiteral(target === 'server'))
                modified = true
              } else if (name === 'ssr') {
                // If target is client, ssr is always false
                // If target is server, leave it as-is (it's a getter that returns SSR phase)
                if (target === 'client') {
                  p.replaceWith(makeBooleanLiteral(false))
                  modified = true
                }
                // Note: For server target, env.target.is.ssr is a getter, so we leave it as-is
              }
            }
          }
          // Handle env.mode.name
          else if (
            mode !== false &&
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'Identifier' &&
            (node.object.object.name === 'env' || node.object.object.name === '_point0_env') &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'mode' &&
            node.property.type === 'Identifier' &&
            node.property.name === 'name'
          ) {
            p.replaceWith(makeStringLiteral(mode))
            modified = true
          }
          // Handle env.built
          else if (
            node.object.type === 'Identifier' &&
            (node.object.name === 'env' || node.object.name === '_point0_env') &&
            node.property.type === 'Identifier' &&
            node.property.name === 'built'
          ) {
            p.replaceWith(makeBooleanLiteral(built))
            modified = true
          }
          // Handle env.mode.is.production, env.mode.is.development, env.mode.is.test
          else if (
            mode !== false &&
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'MemberExpression' &&
            node.object.object.object.type === 'Identifier' &&
            (node.object.object.object.name === 'env' || node.object.object.object.name === '_point0_env') &&
            node.object.object.property.type === 'Identifier' &&
            node.object.object.property.name === 'mode' &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'is'
          ) {
            if (node.property.type === 'Identifier') {
              const name = node.property.name
              if (name === 'production') {
                p.replaceWith(makeBooleanLiteral(isProduction))
                modified = true
              } else if (name === 'development') {
                p.replaceWith(makeBooleanLiteral(isDevelopment))
                modified = true
              } else if (name === 'test') {
                p.replaceWith(makeBooleanLiteral(isTest))
                modified = true
              }
            }
          }
          // Handle env.scope.is.X - replace with true if scope matches, false otherwise
          else if (
            scope !== false &&
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'MemberExpression' &&
            node.object.object.object.type === 'Identifier' &&
            (node.object.object.object.name === 'env' || node.object.object.object.name === '_point0_env') &&
            node.object.object.property.type === 'Identifier' &&
            node.object.object.property.name === 'scope' &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'is' &&
            node.property.type === 'Identifier'
          ) {
            const scopeName = node.property.name
            p.replaceWith(makeBooleanLiteral(scope === scopeName))
            modified = true
          }
          // Handle env.vars.X - replace if X is in consts
          else if (
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'Identifier' &&
            (node.object.object.name === 'env' || node.object.object.name === '_point0_env') &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'vars' &&
            node.property.type === 'Identifier'
          ) {
            const varName = node.property.name
            // if (shouldReplaceVar(varName)) {
            //   const envValue = process.env[varName]
            //   if (envValue === undefined) {
            //     p.replaceWith(makeUndefined())
            //   } else {
            //     // Try to determine the type - for now, always use string literal
            //     // Could be enhanced to detect number/boolean
            //     p.replaceWith(makeStringLiteral(envValue))
            //   }
            //   modified = true
            // }
            const checkResult = checkReplaceVar(varName, process.env[varName])
            if (checkResult.shouldReplace) {
              const desiredValue = checkResult.desiredValue
              if (typeof desiredValue === 'string') {
                p.replaceWith(makeStringLiteral(desiredValue))
                modified = true
              } else if (typeof desiredValue === 'number') {
                p.replaceWith(makeNumericLiteral(desiredValue))
                modified = true
              } else if (typeof desiredValue === 'boolean') {
                p.replaceWith(makeBooleanLiteral(desiredValue))
                modified = true
              } else if (desiredValue === null) {
                p.replaceWith(makeNullLiteral())
                modified = true
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              } else if (desiredValue === undefined) {
                p.replaceWith(makeUndefined())
                modified = true
              }
            }
          }
        },

        CallExpression: (p) => {
          const node = p.node
          const callee = node.callee

          if (callee.type !== 'MemberExpression') return

          const args = node.arguments as any[]

          // Handle env.target.define.server(), env.target.define.client()
          if (
            target !== false &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'MemberExpression' &&
            callee.object.object.object.type === 'Identifier' &&
            (callee.object.object.object.name === 'env' || callee.object.object.object.name === '_point0_env') &&
            callee.object.object.property.type === 'Identifier' &&
            callee.object.object.property.name === 'target' &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'define'
          ) {
            if (callee.property.type === 'Identifier') {
              const name = callee.property.name

              if (name === 'server' && target === 'client' && args.length > 0) {
                args[0] = makeUndefined()
                modified = true
              } else if (name === 'client' && target === 'server' && args.length > 0) {
                args[0] = makeUndefined()
                modified = true
              }
            }
          }
          // Handle env.target.define.unsafe.server(), env.target.define.unsafe.client()
          else if (
            target !== false &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'MemberExpression' &&
            callee.object.object.object.type === 'MemberExpression' &&
            callee.object.object.object.object.type === 'Identifier' &&
            (callee.object.object.object.object.name === 'env' ||
              callee.object.object.object.object.name === '_point0_env') &&
            callee.object.object.object.property.type === 'Identifier' &&
            callee.object.object.object.property.name === 'target' &&
            callee.object.object.property.type === 'Identifier' &&
            callee.object.object.property.name === 'define' &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'unsafe'
          ) {
            if (callee.property.type === 'Identifier') {
              const name = callee.property.name

              if (name === 'server' && target === 'client' && args.length > 0) {
                args[0] = makeUndefined()
                modified = true
              } else if (name === 'client' && target === 'server' && args.length > 0) {
                args[0] = makeUndefined()
                modified = true
              }
            }
          }
          // Handle env.scope.define.X() - replace with value if scope matches, undefined otherwise
          else if (
            scope !== false &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'MemberExpression' &&
            callee.object.object.object.type === 'Identifier' &&
            (callee.object.object.object.name === 'env' || callee.object.object.object.name === '_point0_env') &&
            callee.object.object.property.type === 'Identifier' &&
            callee.object.object.property.name === 'scope' &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'define' &&
            callee.property.type === 'Identifier'
          ) {
            const scopeName = callee.property.name
            if (scope !== scopeName && args.length > 0) {
              args[0] = makeUndefined()
              modified = true
            }
          }
          // Handle env.scope.define.unsafe.X() - replace with value if scope matches, undefined otherwise
          else if (
            scope !== false &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'MemberExpression' &&
            callee.object.object.object.type === 'MemberExpression' &&
            callee.object.object.object.object.type === 'Identifier' &&
            (callee.object.object.object.object.name === 'env' ||
              callee.object.object.object.object.name === '_point0_env') &&
            callee.object.object.object.property.type === 'Identifier' &&
            callee.object.object.object.property.name === 'scope' &&
            callee.object.object.property.type === 'Identifier' &&
            callee.object.object.property.name === 'define' &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'unsafe' &&
            callee.property.type === 'Identifier'
          ) {
            const scopeName = callee.property.name
            if (scope !== scopeName && args.length > 0) {
              args[0] = makeUndefined()
              modified = true
            }
          }
          // Handle env.scope.define() with options object
          else if (
            scope !== false &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'Identifier' &&
            (callee.object.object.name === 'env' || callee.object.object.name === '_point0_env') &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'scope' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'define'
          ) {
            if (args.length > 0 && args[0].type === 'ObjectExpression') {
              const props = args[0].properties as any[]
              // Replace all properties that don't match the current scope with undefined
              for (const prop of props) {
                if (prop.key.type === 'Identifier' && prop.key.name !== scope && prop.value) {
                  prop.value = makeUndefined()
                  modified = true
                }
              }
            }
          }
          // Handle env.target.define() with options object
          else if (
            target !== false &&
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'Identifier' &&
            (callee.object.object.name === 'env' || callee.object.object.name === '_point0_env') &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'target' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'define'
          ) {
            if (args.length > 0 && args[0].type === 'ObjectExpression') {
              const props = args[0].properties as any[]
              if (target === 'client') {
                // Find server property and replace with undefined
                for (const prop of props) {
                  if (prop.key.type === 'Identifier' && prop.key.name === 'server' && prop.value) {
                    prop.value = makeUndefined()
                    modified = true
                  }
                }
              } else {
                // Find client property and replace with undefined
                for (const prop of props) {
                  if (prop.key.type === 'Identifier' && prop.key.name === 'client' && prop.value) {
                    prop.value = makeUndefined()
                    modified = true
                  }
                }
              }
            }
          }
        },
      })

      this._shakeForEnv = { target, scope, mode, consts, built, errors, ok: true, modified }
      this.modified ||= modified
      return this._shakeForEnv
    } catch (e) {
      errors.push(e)
      this._shakeForEnv = { target, scope, mode, consts, built, errors, ok: false, modified }
      return this._shakeForEnv
    }
  }

  private _shakeForBuiltEngine:
    | {
        errors: unknown[]
        ok: boolean
        modified: boolean
      }
    | undefined = undefined
  shakeForBuiltEngine(): {
    errors: unknown[]
    ok: boolean
    modified: boolean
  } {
    const errors: unknown[] = []
    let modified = false
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._shakeForBuiltEngine) {
      return this._shakeForBuiltEngine
    }
    if (!this.content.includes('Engine.create')) {
      this._shakeForBuiltEngine = { errors, ok: true, modified }
      return this._shakeForBuiltEngine
    }

    try {
      const makeObjectExpression = () =>
        ({
          type: 'ObjectExpression',
          properties: [],
        }) as any

      const makeArrayExpression = () =>
        ({
          type: 'ArrayExpression',
          elements: [],
        }) as any

      const processObjectExpression = (objExpr: any): void => {
        if (objExpr.type !== 'ObjectExpression') return

        const propertiesToReplace = [
          { name: 'viteConfig', value: makeObjectExpression() },
          { name: 'bunBuildConfig', value: makeObjectExpression() },
          { name: 'bunPlugins', value: makeArrayExpression() },
        ]

        // Process properties in this object
        for (const propToReplace of propertiesToReplace) {
          const propIndex = objExpr.properties.findIndex(
            (prop: any) =>
              prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === propToReplace.name,
          )

          if (propIndex !== -1 && propToReplace.value) {
            objExpr.properties[propIndex].value = propToReplace.value
            modified = true
          }
        }

        // Recursively process nested objects (server, clients array elements, etc.)
        for (const prop of objExpr.properties) {
          if (prop.type === 'ObjectProperty' && prop.value) {
            if (prop.value.type === 'ObjectExpression') {
              processObjectExpression(prop.value)
            } else if (prop.value.type === 'ArrayExpression') {
              // Process array elements (like clients array)
              for (const element of prop.value.elements) {
                if (element?.type === 'ObjectExpression') {
                  processObjectExpression(element)
                }
              }
            }
          }
        }
      }

      traverse(this.ast, {
        CallExpression: (p) => {
          const node = p.node
          // Check if this is Engine.create(...)
          if (
            node.callee.type === 'MemberExpression' &&
            node.callee.object.type === 'Identifier' &&
            node.callee.object.name === 'Engine' &&
            node.callee.property.type === 'Identifier' &&
            node.callee.property.name === 'create'
          ) {
            // Handle first argument - should be an object expression
            if (node.arguments.length > 0 && node.arguments[0].type === 'ObjectExpression') {
              processObjectExpression(node.arguments[0])
            }
            // Do NOT touch the second argument
          }
        },
      })

      this._shakeForBuiltEngine = { errors, ok: true, modified }
      this.modified ||= modified
      return this._shakeForBuiltEngine
    } catch (e) {
      errors.push(e)
      this._shakeForBuiltEngine = { errors, ok: false, modified }
      return this._shakeForBuiltEngine
    }
  }
}

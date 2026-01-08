import generatorModule from '@babel/generator'
import babel from '@babel/parser'
import type traverseType from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type { File } from '@babel/types'
import * as nodeFs from 'node:fs/promises'

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
  timestamp: THasContent extends true ? number : undefined
  hasRead: boolean
  modified = false

  private constructor({
    abs,
    content,
    timestamp,
    hasRead,
  }: {
    abs: string
    content: string | undefined
    timestamp: number | undefined
    hasRead: boolean
  }) {
    this.abs = abs
    this.content = content as THasContent extends true ? string : undefined
    this.timestamp = timestamp as THasContent extends true ? number : undefined
    this.hasRead = hasRead
  }

  static create<TContent extends string | undefined = undefined>(
    fileAbs: string,
    content?: TContent,
  ): CompilerFile<TContent extends string ? true : false> {
    return new CompilerFile({
      abs: fileAbs,
      content,
      timestamp: typeof content !== 'undefined' ? 0 : undefined,
      hasRead: false,
    })
  }

  static async read(fileAbs: string): Promise<CompilerFile<true>> {
    return await CompilerFile.create(fileAbs).read()
  }

  hasContent(): this is CompilerFile<true> {
    return this.hasRead
  }

  isParsed() {
    return !!this.ast
  }

  assertRead(): asserts this is CompilerFile<true> {
    if (!this.hasRead) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
  }

  async read(): Promise<CompilerFile<true>> {
    if (this.content) {
      return this as CompilerFile<true>
    }
    const stats = await (async () => {
      try {
        return await nodeFs.stat(this.abs)
      } catch (e) {
        throw new Error(`Failed to read file ${this.abs}: ${(e as Error).message}`, { cause: e })
      }
    })()
    const result = this as CompilerFile<true>
    result.content = await nodeFs.readFile(this.abs, 'utf8')
    result.timestamp = stats.mtimeMs
    result.hasRead = true
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
    this._mayContainPoints = this.content.includes('.lets(')
    return this._mayContainPoints
  }

  toCode(): string {
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    const { code } = babelGenerator(this.ast, { retainLines: true })
    return code
  }

  private _shakeForEngineHolderBuildPhase:
    | {
        errors: unknown[]
        ok: boolean
        modified: boolean
      }
    | false = false
  shakeForEngineHolderBuildPhase({ isEngineHolderBuildPhase }: { isEngineHolderBuildPhase: boolean }): {
    errors: unknown[]
    ok: boolean
    modified: boolean
  } {
    const errors: unknown[] = []
    let modified = false
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._shakeForEngineHolderBuildPhase) {
      return this._shakeForEngineHolderBuildPhase
    }
    try {
      if (!isEngineHolderBuildPhase) {
        this._shakeForEngineHolderBuildPhase = { errors, ok: true, modified }
        return this._shakeForEngineHolderBuildPhase
      }
      if (!this.content.includes('shakeItOnEngineHolderBuildPhase')) {
        this._shakeForEngineHolderBuildPhase = { errors, ok: true, modified }
        return this._shakeForEngineHolderBuildPhase
      }

      const makeThrow = () => ({
        type: 'ArrowFunctionExpression',
        id: null,
        generator: false,
        async: false,
        expression: false,
        params: [],
        body: {
          type: 'BlockStatement',
          body: [
            {
              type: 'ThrowStatement',
              argument: {
                type: 'NewExpression',
                callee: { type: 'Identifier', name: 'Error' },
                arguments: [{ type: 'StringLiteral', value: 'Not available after build' }],
              },
            },
          ],
        },
      })

      traverse(this.ast, {
        CallExpression: (p) => {
          const node = p.node
          const callee = node.callee

          // Check if callee is an Identifier named 'shakeItOnEngineHolderBuildPhase'
          if (callee.type === 'Identifier' && callee.name === 'shakeItOnEngineHolderBuildPhase') {
            const args = node.arguments as any[]
            // Replace the first argument (callback) with the throw function
            if (args.length > 0) {
              args[0] = makeThrow()
              modified = true
            }
          }
        },
      })

      this.modified ||= modified
      this._shakeForEngineHolderBuildPhase = { errors, ok: true, modified }
      return this._shakeForEngineHolderBuildPhase
    } catch (e) {
      errors.push(e)
      this._shakeForEngineHolderBuildPhase = { errors, ok: false, modified }
      return this._shakeForEngineHolderBuildPhase
    }
  }

  private _shakeForEnv:
    | {
        target: 'client' | 'server'
        scope: string
        consts: string[] // can be env name like NODE_ENV, or string SOMETHING_* then we should force value for all const started with SOMETHING_
        errors: unknown[]
        ok: boolean
        modified: boolean
      }
    | false = false
  shakeForEnv({ target, scope, consts = [] }: { target: 'client' | 'server'; scope: string; consts?: string[] }): {
    target: 'client' | 'server'
    scope: string
    consts: string[]
    errors: unknown[]
    ok: boolean
    modified: boolean
  } {
    const errors: unknown[] = []
    consts.push('NODE_ENV', 'POINT0_SCOPE_NAME')
    let modified = false
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._shakeForEnv) {
      if (this._shakeForEnv.target !== target) {
        throw new Error(`Already shaked for target ${this._shakeForEnv.target}`)
      }
      return this._shakeForEnv
    }
    try {
      if (!this.content.includes('@point0/env')) {
        this._shakeForEnv = { target, scope, consts, errors, ok: true, modified }
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

      // Helper to check if a var name matches consts (supports wildcard patterns like "SOMETHING_*")
      const shouldReplaceVar = (varName: string): boolean => {
        for (const constPattern of consts) {
          if (constPattern.endsWith('*')) {
            const prefix = constPattern.slice(0, -1)
            if (varName.startsWith(prefix)) {
              return true
            }
          } else if (varName === constPattern) {
            return true
          }
        }
        return false
      }

      // Get NODE_ENV value from process.env
      const nodeEnv = process.env.NODE_ENV || 'development'
      const isProduction = nodeEnv === 'production'
      const isDevelopment = nodeEnv === 'development'
      const isTest = nodeEnv === 'test'

      traverse(this.ast, {
        MemberExpression: (p) => {
          const node = p.node

          // Handle env.target.is.client, env.target.is.server
          if (
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'MemberExpression' &&
            node.object.object.object.type === 'Identifier' &&
            node.object.object.object.name === 'env' &&
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
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'Identifier' &&
            node.object.object.name === 'env' &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'mode' &&
            node.property.type === 'Identifier' &&
            node.property.name === 'name'
          ) {
            p.replaceWith(makeStringLiteral(nodeEnv))
            modified = true
          }
          // Handle env.mode.is.production, env.mode.is.development, env.mode.is.test
          else if (
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'MemberExpression' &&
            node.object.object.object.type === 'Identifier' &&
            node.object.object.object.name === 'env' &&
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
          // Handle env.vars.X - replace if X is in consts
          else if (
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'Identifier' &&
            node.object.object.name === 'env' &&
            node.object.property.type === 'Identifier' &&
            node.object.property.name === 'vars' &&
            node.property.type === 'Identifier'
          ) {
            const varName = node.property.name
            if (shouldReplaceVar(varName)) {
              const envValue = process.env[varName]
              if (envValue === undefined) {
                p.replaceWith(makeUndefined())
              } else {
                // Try to determine the type - for now, always use string literal
                // Could be enhanced to detect number/boolean
                p.replaceWith(makeStringLiteral(envValue))
              }
              modified = true
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
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'MemberExpression' &&
            callee.object.object.object.type === 'Identifier' &&
            callee.object.object.object.name === 'env' &&
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
          // Handle env.target.define() with options object
          else if (
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'Identifier' &&
            callee.object.object.name === 'env' &&
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

      this._shakeForEnv = { target, scope, consts, errors, ok: true, modified }
      this.modified ||= modified
      return this._shakeForEnv
    } catch (e) {
      errors.push(e)
      this._shakeForEnv = { target, scope, consts, errors, ok: false, modified }
      return this._shakeForEnv
    }
  }
}

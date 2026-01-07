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

  private _shakeForRuntimeTarget:
    | {
        target: 'client' | 'server'
        errors: unknown[]
        ok: boolean
        modified: boolean
      }
    | false = false
  shakeForRuntimeTarget({ target }: { target: 'client' | 'server' }): {
    target: 'client' | 'server'
    errors: unknown[]
    ok: boolean
    modified: boolean
  } {
    const errors: unknown[] = []
    let modified = false
    if (!this.content) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._shakeForRuntimeTarget) {
      if (this._shakeForRuntimeTarget.target !== target) {
        throw new Error(`Already shaked for target ${this._shakeForRuntimeTarget.target}`)
      }
      return this._shakeForRuntimeTarget
    }
    try {
      if (!this.content.includes('@point0/runtime')) {
        this._shakeForRuntimeTarget = { target, errors, ok: true, modified }
        return this._shakeForRuntimeTarget
      }

      const makeThrow = (msg: string) => ({
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
                arguments: [{ type: 'StringLiteral', value: msg }],
              },
            },
          ],
        },
      })

      const makeUndefined = () => ({
        type: 'Identifier',
        name: 'undefined',
      })

      traverse(this.ast, {
        MemberExpression: (p) => {
          const node = p.node

          // Handle runtime.is.client, runtime.is.server, runtime.is.ssr
          if (
            node.object.type === 'MemberExpression' &&
            node.object.object.type === 'Identifier' &&
            node.object.object.name === 'runtime'
          ) {
            if (node.object.property.type === 'Identifier' && node.object.property.name === 'is') {
              if (node.property.type === 'Identifier') {
                const name = node.property.name
                if (name === 'client') {
                  p.replaceWith({
                    type: 'BooleanLiteral',
                    value: target === 'client',
                  })
                  modified = true
                } else if (name === 'server') {
                  p.replaceWith({
                    type: 'BooleanLiteral',
                    value: target === 'server',
                  })
                  modified = true
                }
                // Note: runtime.is.ssr is a getter that returns a function result, so we leave it as-is
              }
            }
          }
        },

        CallExpression: (p) => {
          const node = p.node
          const callee = node.callee

          if (callee.type !== 'MemberExpression') return

          const args = node.arguments as any[]

          // Handle runtime.call.server(), runtime.call.client()
          if (
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'Identifier' &&
            callee.object.object.name === 'runtime' &&
            callee.object.property.type === 'Identifier' &&
            callee.object.property.name === 'call'
          ) {
            if (callee.property.type === 'Identifier') {
              const name = callee.property.name

              if (name === 'server' && target === 'client' && args.length > 0) {
                args[0] = makeThrow('Call server function from client')
                modified = true
              } else if (name === 'client' && target === 'server' && args.length > 0) {
                args[0] = makeThrow('Call client function from server')
                modified = true
              }
            }
          }
          // Handle runtime.call() with options object
          else if (
            callee.object.type === 'Identifier' &&
            callee.object.name === 'runtime' &&
            callee.property.type === 'Identifier' &&
            callee.property.name === 'call'
          ) {
            if (args.length > 0 && args[0].type === 'ObjectExpression') {
              const props = args[0].properties as any[]
              if (target === 'client') {
                // Find server property and replace with throw
                for (const prop of props) {
                  if (prop.key.type === 'Identifier' && prop.key.name === 'server' && prop.value) {
                    prop.value = makeThrow('Call server function from client')
                    modified = true
                  }
                }
              } else {
                // Find client property and replace with throw
                for (const prop of props) {
                  if (prop.key.type === 'Identifier' && prop.key.name === 'client' && prop.value) {
                    prop.value = makeThrow('Call client function from server')
                    modified = true
                  }
                }
              }
            }
          }
          // Handle runtime.define.server(), runtime.define.client()
          else if (
            callee.object.type === 'MemberExpression' &&
            callee.object.object.type === 'Identifier' &&
            callee.object.object.name === 'runtime' &&
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
          // Handle runtime.define() with options object
          else if (
            callee.object.type === 'Identifier' &&
            callee.object.name === 'runtime' &&
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

      this._shakeForRuntimeTarget = { target, errors, ok: true, modified }
      this.modified ||= modified
      return this._shakeForRuntimeTarget
    } catch (e) {
      errors.push(e)
      this._shakeForRuntimeTarget = { target, errors, ok: false, modified }
      return this._shakeForRuntimeTarget
    }
  }
}

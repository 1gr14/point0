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

export class CompilerFile<TState extends 'idle' | 'read' | 'parsed' = 'idle' | 'read' | 'parsed'> {
  readonly abs: string
  content: TState extends 'read' | 'parsed' ? string : undefined
  ast: TState extends 'parsed' ? babel.ParseResult<File> : undefined
  timestamp: TState extends 'read' | 'parsed' ? number : undefined
  state: TState
  forcedContent: string | undefined
  modified: boolean

  // I think it is ok not clone ast when we try to modify, becouse if we modify then we do not need previous values of ast
  // private _astModified: babel.ParseResult<File> | undefined
  // get astModified(): TState extends 'parsed' ? babel.ParseResult<File> : undefined {
  //   if (this._astModified) {
  //     return this._astModified as TState extends 'parsed' ? babel.ParseResult<File> : undefined
  //   }
  //   if (!this.isParsed()) {
  //     return undefined as TState extends 'parsed' ? babel.ParseResult<File> : undefined
  //   }
  //   this._astModified = {
  //     ...this.ast,
  //     program: traverse.cloneNode(this.ast.program, /* deep */ true),
  //   }
  //   return this.ast
  // }

  static collection = new Map<string, CompilerFile>()

  private constructor({
    abs,
    content,
    ast,
    timestamp,
    state,
  }: {
    abs: string
    content?: string
    ast?: babel.ParseResult<File>
    timestamp?: number
    state: TState
  }) {
    this.abs = abs
    this.content = content as TState extends 'read' | 'parsed' ? string : undefined
    this.ast = ast as TState extends 'parsed' ? babel.ParseResult<File> : undefined
    this.timestamp = timestamp as TState extends 'read' | 'parsed' ? number : undefined
    this.state = state
    this.modified = false
    CompilerFile.collection.set(abs, this)
  }

  static create(fileAbs: string): CompilerFile {
    const exFile = this.collection.get(fileAbs)
    if (exFile) {
      return exFile
    }
    return new CompilerFile({ abs: fileAbs, state: 'idle' })
  }

  isRead(): this is CompilerFile<'read' | 'parsed'> {
    return this.state === 'read' || this.state === 'parsed'
  }

  isParsed(): this is CompilerFile<'parsed'> {
    return this.state === 'parsed'
  }

  static getCachedContentOrUndefined(fileAbs: string): string | undefined {
    const exFile = CompilerFile.collection.get(fileAbs)
    if (exFile) {
      return exFile.content
    }
    return undefined
  }

  getSelfActual(): CompilerFile {
    const exFile = CompilerFile.collection.get(this.abs)
    if (exFile) {
      return exFile
    }
    return new CompilerFile({ abs: this.abs, state: 'idle' })
  }

  async read(options?: { content?: string }): Promise<CompilerFile<'read' | 'parsed'>> {
    const forcedContent = options?.content
    if (forcedContent !== undefined) {
      return Object.assign(this, {
        content: forcedContent,
        timestamp: 0,
        state: 'read',
        ast: undefined,
        modified: false,
        _mayContainPoints: undefined,
        forcedContent,
        _pruneForEngineHolderBuildPhase: false,
        _pruneForRuntimeTarget: false,
      }) as CompilerFile<'read'>
    }
    if (this.forcedContent !== undefined) {
      return this as CompilerFile<'read' | 'parsed'>
    }

    const self = this.getSelfActual()
    const stats = await (async () => {
      try {
        return await nodeFs.stat(self.abs)
      } catch (e) {
        throw new Error(`Failed to read file ${self.abs}: ${(e as Error).message}`, { cause: e })
      }
    })()
    const currentTimestamp = stats.mtimeMs
    if (self.timestamp === currentTimestamp && self.isRead()) {
      return self
    }
    const content = await nodeFs.readFile(this.abs, 'utf8')
    return Object.assign(self, {
      content,
      timestamp: currentTimestamp,
      state: 'read',
      ast: undefined,
      modified: false,
      _mayContainPoints: undefined,
      _pruneForEngineHolderBuildPhase: false,
      _pruneForRuntimeTarget: false,
    }) as CompilerFile<'read'>
  }

  parse(): CompilerFile<'parsed'> {
    const self = this.getSelfActual()
    if (self.isParsed()) {
      return self
    }
    if (!self.isRead()) {
      throw new Error(`File ${self.abs} is not read yet`)
    }
    const ast = babel.parse(self.content, {
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
    return Object.assign(self, {
      ast,
      state: 'parsed',
      modified: false,
    }) as CompilerFile<'parsed'>
  }

  private _mayContainPoints: boolean | undefined = undefined
  mayContainPoints(): boolean {
    if (!this.isRead()) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._mayContainPoints !== undefined) {
      return this._mayContainPoints
    }
    this._mayContainPoints = this.content.includes('.lets(')
    return this._mayContainPoints
  }

  toCode(): string {
    if (!this.isRead()) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (!this.isParsed()) {
      throw new Error(`File ${this.abs} is not parsed yet`)
    }
    const { code } = babelGenerator(this.ast, { retainLines: true })
    return code
  }

  // TODO:ASAP check if we can not prune this, and just exclude vite from server build
  private _pruneForEngineHolderBuildPhase = false
  pruneForEngineHolderBuildPhase(isEngineHolderBuildPhase: boolean): void {
    if (!isEngineHolderBuildPhase) {
      return
    }
    if (this._pruneForEngineHolderBuildPhase) {
      return
    }
    if (!this.isRead()) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (!this.content.includes('pruneItOnEngineHolderBuildPhase')) {
      return
    }
    const parsed = this.isParsed() ? this : this.parse()

    let modified = false

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

    traverse(parsed.ast, {
      CallExpression: (p) => {
        const node = p.node
        const callee = node.callee

        // Check if callee is an Identifier named 'pruneItOnEngineHolderBuildPhase'
        if (callee.type === 'Identifier' && callee.name === 'pruneItOnEngineHolderBuildPhase') {
          const args = node.arguments as any[]
          // Replace the first argument (callback) with the throw function
          if (args.length > 0) {
            args[0] = makeThrow()
            modified = true
          }
        }
      },
    })

    this._pruneForEngineHolderBuildPhase = true
    this.modified ||= modified
  }

  private _pruneForRuntimeTarget: false | 'client' | 'server' = false
  pruneForRuntimeTarget(target: 'client' | 'server'): void {
    if (!this.isRead()) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (!this.content.includes('@point0/runtime')) {
      return
    }
    const parsed = this.isParsed() ? this : this.parse()
    if (this._pruneForRuntimeTarget) {
      if (this._pruneForRuntimeTarget === target) {
        return
      }
      throw new Error(`File ${this.abs} is already pruned for runtime target ${this._pruneForRuntimeTarget}`)
    }

    let modified = false

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

    traverse(parsed.ast, {
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

    this.modified ||= modified

    this._pruneForRuntimeTarget = target
  }
}

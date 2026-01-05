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

  getSelfActual(): CompilerFile {
    const exFile = CompilerFile.collection.get(this.abs)
    if (exFile) {
      return exFile
    }
    return new CompilerFile({ abs: this.abs, state: 'idle' })
  }

  async read(options?: { content?: string }): Promise<CompilerFile<'read' | 'parsed'>> {
    const forcedContent = options?.content
    if (forcedContent) {
      return Object.assign(this, {
        content: forcedContent,
        timestamp: 0,
        state: 'read',
        ast: undefined,
        _mayContainPoints: undefined,
        forcedContent,
      }) as CompilerFile<'read'>
    }
    if (this.forcedContent) {
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
      _mayContainPoints: undefined,
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
  pruneForBuildPhase(): void {
    if (!this.isRead()) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (!this.isParsed()) {
      throw new Error(`File ${this.abs} is not parsed yet`)
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

        // Check if callee is an Identifier named 'pruneItWhenPoint0ServerBuildInProgress'
        if (callee.type === 'Identifier' && callee.name === 'pruneItWhenPoint0ServerBuildInProgress') {
          const args = node.arguments as any[]
          // Replace the first argument (callback) with the throw function
          if (args.length > 0) {
            args[0] = makeThrow()
          }
        }
      },
    })
  }
}

import { transformFromAstSync, type PluginItem } from '@babel/core'
import type { GeneratorResult } from '@babel/generator'
import generatorModule from '@babel/generator'
import babel from '@babel/parser'
import presetTypescriptModule from '@babel/preset-typescript'
import type traverseType from '@babel/traverse'
import type { NodePath } from '@babel/traverse'
import traverseModule from '@babel/traverse'
import type { File, Node, ObjectExpression, ObjectMethod, ObjectProperty, SpreadElement } from '@babel/types'
import * as t from '@babel/types'
import remappingModule from '@jridgewell/remapping'
import { compileSync, type CompileOptions } from '@mdx-js/mdx'

const remapping = ((remappingModule as any).default ?? remappingModule) as typeof remappingModule extends {
  default: infer T
}
  ? T
  : typeof remappingModule
import type { EnvOsName, EnvRuntimeName, NormalizedNodeEnv } from '@point0/core'
import minifyDeadCodeEliminationModule from 'babel-plugin-minify-dead-code-elimination'
import minifyGuardedExpressionsModule from 'babel-plugin-minify-guarded-expressions'
import fg from 'fast-glob'
import * as nodeFsSync from 'node:fs'
import * as nodeFsAsync from 'node:fs/promises'
import * as nodePath from 'node:path'
import prettier from 'prettier'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import type { Compiler, CompilerEnvConsts, ImportsTraceResult } from './compiler.js'
import { resolveImporterRule, writeOrCreateVirtualModulePath, type ImporterOptionsParsed } from './importer.js'
import { CompilerPoint, POINT_METHOD_TO_TYPE_MAP } from './point.js'
import { FileResolver } from './resolver.js'
import { getHash, normalizeEnvConsts, toPosixPath } from './utils.js'
import type { Walker } from './walker.js'

const traverse = ((traverseModule as any).default ?? traverseModule) as typeof traverseType extends { default: infer T }
  ? T
  : typeof traverseType

const babelGenerator = ((generatorModule as any).default ?? generatorModule) as typeof generatorModule extends {
  default: infer T
}
  ? T
  : typeof generatorModule

const minifyGuardedExpressions = ((minifyGuardedExpressionsModule as any).default ??
  minifyGuardedExpressionsModule) as typeof minifyGuardedExpressionsModule
const minifyDeadCodeElimination = ((minifyDeadCodeEliminationModule as any).default ??
  minifyDeadCodeEliminationModule) as typeof minifyDeadCodeEliminationModule

// Matches third-party (node_modules) and framework-compiled workspace output (packages/<pkg>/dist/).
// User babel plugins like react-compiler should never touch these — they're either published
// packages or already-emitted framework code, and re-transforming risks breaking the output shape.

// const nonUserCodePathRegex = /(?:[\\/]node_modules[\\/]|[\\/]packages[\\/][^\\/]+[\\/]dist[\\/])/
// const isNonUserCodePath = (abs: string): boolean => nonUserCodePathRegex.test(abs)

const presetTypescript = ((presetTypescriptModule as any).default ??
  presetTypescriptModule) as typeof presetTypescriptModule

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
  imports: CompilerFileImport[]

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
    this.imports = []
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
    // Posix-normalize the moment a path enters the compiler: this `file` becomes the `walker.files` cache key and every
    // key derived from it (a point's `strpos`, cycle visited-sets, resolver results). Callers may pass native paths while
    // the resolver yields posix — without this one file gets two identities, so caches miss and cycle detection loops.
    file = toPosixPath(file)
    const exCf = walker.files.get(file)
    const contentProvided = typeof content !== 'undefined'
    if (exCf && !contentProvided) {
      return exCf
    }
    const cf = new CompilerFile({
      abs: file,
      content,
      mtime: contentProvided ? 0 : undefined,
      rtime: Date.now(),
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
    cloned._hasTypescriptSyntax = this._hasTypescriptSyntax
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
    this._hasTypescriptSyntax = undefined
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

  // static async readAsync({
  //   walker,
  //   file,
  //   fresh,
  // }: {
  //   walker: Walker
  //   file: string
  //   fresh: boolean
  // }): Promise<CompilerFile<true>> {
  //   return await CompilerFile.create({ walker, file }).readAsync(fresh)
  // }

  static readSync({
    walker,
    file,
    fresh,
    stats,
  }: {
    walker: Walker
    file: string
    fresh: boolean
    stats?: nodeFsSync.Stats
  }): CompilerFile<true> {
    return CompilerFile.create({ walker, file }).readSync(fresh, stats)
  }

  hasContent(): this is CompilerFile<true> {
    return this.content !== undefined
  }

  isParsed() {
    return !!this.ast
  }

  assertHasContent(): asserts this is CompilerFile<true> {
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
  }

  readSync(fresh: boolean, stats?: nodeFsSync.Stats): CompilerFile<true> {
    if (this.content !== undefined && !fresh) {
      return this as CompilerFile<true>
    }
    stats ??= nodeFsSync.statSync(this.abs)
    if (stats.mtimeMs === this.mtime && this.content !== undefined) {
      return this as CompilerFile<true>
    }
    this.pruneMemory()
    const result = this as CompilerFile<true>
    this.walker.files.set(this.abs, result)
    result.content = nodeFsSync.readFileSync(this.abs, 'utf8')
    result.mtime = stats.mtimeMs
    result.rtime = Date.now()
    return result
  }

  _parse:
    | { ast: babel.ParseResult<File>; errors: unknown[]; ok: true }
    | { ast: undefined; errors: unknown[]; ok: false }
    | undefined = undefined
  parse():
    | { ast: babel.ParseResult<File>; errors: unknown[]; ok: true }
    | { ast: undefined; errors: unknown[]; ok: false } {
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._parse) {
      return this._parse
    }
    const errors: unknown[] = []
    try {
      // MD/MDX/MDC are not valid Babel syntax directly.
      // Precompile them into JS program text before parsing.
      if (CompilerFile.isMdxLikePath(this.abs)) {
        try {
          const compiled = compileSync(this.content, this.walker.markdown ?? CompilerFile.getDefaultMarkdownOptions())
          const nextContent = String(compiled) as THasContent extends true ? string : undefined
          if (!nextContent) {
            errors.push(new Error(`Failed to compile MDX/MDC file ${this.abs}, empty content`))
            this._parse = { ast: undefined, errors, ok: false }
            return this._parse
          }
          if (nextContent !== this.content) {
            this.content = nextContent
            this.modified = true
          }
        } catch (e) {
          errors.push(e)
          this._parse = { ast: undefined, errors, ok: false }
          return this._parse
        }
      }
      const ast = babel.parse(this.content, {
        sourceType: 'module',
        errorRecovery: true,
        // `tokens` keeps comment placement faithful (vite's @vite-ignore detector relies on it);
        // `createParenthesizedExpressions` keeps the author's explicit parens as AST nodes so the
        // generator re-emits them instead of dropping redundant ones. (NB: the post-user-babel
        // re-parse path below deliberately OMITS both — react-compiler bails on paren nodes.)
        tokens: true,
        createParenthesizedExpressions: true,
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'throwExpressions',
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

  static isMdxLikePath(path: string): boolean {
    return /\.(md|mdx|mdc)$/.test(path)
  }

  static getDefaultMarkdownOptions(): CompileOptions {
    return {
      jsx: false,
      outputFormat: 'program',
      format: 'mdx',
      development: false,
      remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
    }
  }

  static isTypescriptLikePath(path: string): boolean {
    return /\.[cm]?tsx?$/.test(path)
  }

  private _hasTypescriptSyntax: boolean | undefined = undefined
  hasTypescriptSyntax(): boolean {
    if (!CompilerFile.isTypescriptLikePath(this.abs)) {
      return false
    }
    if (this._hasTypescriptSyntax !== undefined) {
      return this._hasTypescriptSyntax
    }
    let hasTypescriptSyntax = false
    traverse(this.ast, {
      enter: (path) => {
        const node = path.node
        if (node.type.startsWith('TS')) {
          hasTypescriptSyntax = true
          path.stop()
          return
        }
        if (
          (t.isImportDeclaration(node) && node.importKind === 'type') ||
          (t.isExportNamedDeclaration(node) && node.exportKind === 'type') ||
          (t.isExportAllDeclaration(node) && node.exportKind === 'type')
        ) {
          hasTypescriptSyntax = true
          path.stop()
        }
      },
    })
    this._hasTypescriptSyntax = hasTypescriptSyntax
    return this._hasTypescriptSyntax
  }

  shouldStripTypescript(): boolean {
    return false
    // looks like we never should trim typescript syntax
    // return this.hasTypescriptSyntax()
  }

  pruneTypescriptSyntax(): { ok: boolean; errors: unknown[]; modified: boolean } {
    const errors: unknown[] = []
    let modified = false
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    try {
      if (!this.shouldStripTypescript()) {
        return { ok: true, errors, modified }
      }
      const result = transformFromAstSync(this.ast, this.content, {
        ast: true,
        code: false,
        configFile: false,
        babelrc: false,
        presets: [
          [
            presetTypescript,
            {
              allowNamespaces: true,
              allExtensions: true,
              isTSX: /\.[cm]?tsx$/.test(this.abs),
            },
          ],
        ],
      })
      if (!result?.ast) {
        return { ok: true, errors, modified }
      }
      this.ast.program = result.ast.program
      this._hasTypescriptSyntax = false
      this._isIdentifierExists = {}
      modified = true
      this.modified = true
      return { ok: true, errors, modified }
    } catch (e) {
      errors.push(e)
      return { ok: false, errors, modified }
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
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._mayContainPoints !== undefined) {
      return this._mayContainPoints
    }
    const content = this.content
    let mayContainPoints = false
    // Fast pre-check to avoid regex on files that clearly do not contain point syntax.
    if (content.includes('.let')) {
      // Accept:
      // - `.lets(`
      // - `.lets<...>`
      // - `.lets.<type>(...)`
      // - split form `.let ... s ... (|<|.)`
      mayContainPoints = /\.let(?:s|\s+s)\s*(?:\(|<|\.)/.test(content)
    }

    this._mayContainPoints = mayContainPoints
    return this._mayContainPoints
  }

  desugarLetsTypeCallAtNodePath({ letsSugarNodePath }: { letsSugarNodePath: NodePath<Node> }): {
    ok: boolean
    errors: unknown[]
    letsNodePath?: NodePath<Node>
  } {
    const errors: unknown[] = []
    try {
      const sugarNode = letsSugarNodePath.node
      if (!CompilerPoint.isLetsTypeSugarCall({ node: sugarNode })) {
        return { ok: true, errors, letsNodePath: undefined }
      }
      if (!t.isCallExpression(sugarNode)) {
        return { ok: true, errors, letsNodePath: undefined }
      }
      const callee = sugarNode.callee
      if (!t.isMemberExpression(callee) || !t.isMemberExpression(callee.object) || !t.isIdentifier(callee.property)) {
        return { ok: true, errors, letsNodePath: undefined }
      }
      const pointType = POINT_METHOD_TO_TYPE_MAP[callee.property.name]
      if (!pointType) {
        return { ok: true, errors, letsNodePath: undefined }
      }
      const pointName = CompilerPoint.inferPointNameFromSugarContext({
        type: pointType,
        callPath: letsSugarNodePath,
        absPath: this.abs,
      })
      const letsCall = t.callExpression(t.memberExpression(callee.object.object, t.identifier('lets')), [
        t.stringLiteral(pointType),
        t.stringLiteral(pointName),
        ...sugarNode.arguments,
      ])
      letsCall.loc = sugarNode.loc
      letsCall.start = sugarNode.start
      letsCall.end = sugarNode.end
      const replaced = letsSugarNodePath.replaceWith(letsCall)
      this.modified = true
      return { ok: true, errors, letsNodePath: replaced.at(0) as NodePath<Node> | undefined }
    } catch (e) {
      errors.push(e)
      return { ok: false, errors, letsNodePath: undefined }
    }
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

  toCode({ map: sourceMaps }: { map?: boolean } = {}): {
    code: string
    map: GeneratorResult['map']
  } {
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    // When user babel plugins ran, this.content is the intermediate (regenerated) text and
    // this.ast positions refer to that text. We generate map2 against a SYNTHETIC source label
    // for the intermediate, then chain it with the previously captured map1
    // (intermediate → original) so the inline source map ends up mapping final → original.
    const generatorSourceLabel = this._preUserBabelMap ? this.intermediateSourceLabel : this.abs
    // Our transforms pretty-print the AST and shift lines, so a MODIFIED file's compiled lines no longer match the
    // original. Correct line/column in runtime stack traces is restored by SOURCE MAPS — the engine installs
    // `source-map-support` in the bun dev child, which remaps `err.stack` via `Error.prepareStackTrace` (Bun itself
    // still won't apply an onLoad plugin's map at runtime, oven-sh/bun#6173). So we just emit a faithful map here and
    // let the runtime remap. (Only modified files reach toCode(); unmodified ones return verbatim from compile().)
    const { code, map } = babelGenerator(
      this.ast,
      {
        sourceFileName: generatorSourceLabel,
        ...(sourceMaps ? { sourceMaps: true } : {}),
      },
      this.content,
    )
    if (!sourceMaps || !map || !this._preUserBabelMap) {
      return { code, map }
    }
    const preUserBabelMap = this._preUserBabelMap
    const intermediateLabel = this.intermediateSourceLabel
    const chained = remapping(map as any, (file) => (file === intermediateLabel ? (preUserBabelMap as any) : null))
    // `remapping` resolves a nested map's `sources` as URLs relative to the parent. A posix original (`/abs/page.tsx`)
    // is URL-absolute and survives; a Windows drive path (`C:/…`) is not, so it gets joined onto the intermediate
    // label's dir and comes out doubled, leaking the store path into stack frames. The chain has one real source — pin
    // it back to abs (no-op on posix, already this.abs).
    if (chained.sources.length === 1) {
      chained.sources[0] = this.abs
    }
    return { code, map: chained as unknown as GeneratorResult['map'] }
  }

  optimizeGuardedExpressions(): { ok: boolean; errors: unknown[]; modified: boolean } {
    const errors: unknown[] = []
    let modified = false
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    try {
      const beforeCode = babelGenerator(this.ast, { sourceFileName: this.abs }, this.content).code
      const result = transformFromAstSync(this.ast, this.content, {
        ast: true,
        code: false,
        configFile: false,
        babelrc: false,
        plugins: [
          minifyGuardedExpressions,
          [minifyDeadCodeElimination, { keepFnName: true, keepFnArgs: true, keepClassName: true }],
        ],
      })
      if (!result?.ast) {
        return { ok: true, errors, modified }
      }
      this.pruneUnusedImports({ ast: result.ast })
      const afterCode = babelGenerator(result.ast, { sourceFileName: this.abs }, this.content).code
      if (afterCode !== beforeCode) {
        this.ast.program = result.ast.program
        modified = true
        this.modified = true
      }
      return { ok: true, errors, modified }
    } catch (e) {
      errors.push(e)
      return { ok: false, errors, modified }
    }
  }

  // Chain methods that produce React components and so are eligible for the
  // `"use memo"` directive. Other chain methods (loader, mutation, query, etc.)
  // are server-side or non-component code and must not be marked.
  private static readonly CHAIN_CALLBACK_USE_MEMO_METHODS: ReadonlySet<string> = new Set([
    'page',
    'layout',
    'component',
    'provider',
    'wrapper',
    'with',
  ])

  injectUseMemoOnChainCallbacks(): { ok: boolean; errors: unknown[]; modified: boolean } {
    const errors: unknown[] = []
    let modified = false
    try {
      traverse(this.ast, {
        CallExpression: (path) => {
          const callee = path.node.callee
          if (!t.isMemberExpression(callee)) return
          if (!t.isIdentifier(callee.property)) return
          if (!CompilerFile.CHAIN_CALLBACK_USE_MEMO_METHODS.has(callee.property.name)) return
          for (const arg of path.node.arguments) {
            if (!t.isArrowFunctionExpression(arg) && !t.isFunctionExpression(arg)) continue
            // If the body is already a block and already has "use memo", skip without mutating —
            // don't reshape expression-bodied arrows when there's nothing to actually inject.
            if (
              t.isBlockStatement(arg.body) &&
              arg.body.directives.some((d) => d.value.value === 'use memo' || d.value.value === 'no memo')
            ) {
              break
            }
            // Convert expression-bodied arrows into block bodies so we can attach a directive.
            if (!t.isBlockStatement(arg.body)) {
              arg.body = t.blockStatement([t.returnStatement(arg.body)])
            }
            const block = arg.body
            const hasUseMemo = block.directives.some((d) => d.value.value === 'use memo' || d.value.value === 'no memo')
            if (!hasUseMemo) {
              block.directives.unshift(t.directive(t.directiveLiteral('use memo')))
              modified = true
              this.modified = true
            }
            break
          }
        },
      })
      return { ok: true, errors, modified }
    } catch (e) {
      errors.push(e)
      return { ok: false, errors, modified }
    }
  }

  // When applyUserBabelPlugins runs, it regenerates code from the current AST and re-parses
  // it before handing off to user plugins. That means subsequent generator output's positions
  // refer to the intermediate (post-regenerate) text, not the original file. We keep map1
  // (intermediate → original) here and chain it in toCode() so the final source map walks all
  // the way back to the real source on disk.
  private _preUserBabelMap: GeneratorResult['map'] | undefined = undefined
  // A synthetic label distinct from this.abs, used as the intermediate file's identity in
  // map2's `sources` array. Remapping uses this to know when to recurse into map1.
  // We use a `\0`-prefixed scheme so downstream source-map consumers (Vite, bun, devtools)
  // treat it as an opaque identifier rather than a file path: anything that tries to URL-
  // decode, normalize, or resolve the path will leave a `\0`-prefixed string alone.
  private get intermediateSourceLabel(): string {
    return `\0point0-pre-user-babel:${this.abs}`
  }

  private _applyUserBabelPlugins: { ok: boolean; errors: unknown[]; modified: boolean } | undefined = undefined
  applyUserBabelPlugins({ plugins, presets }: { plugins: PluginItem[]; presets: PluginItem[] }): {
    ok: boolean
    errors: unknown[]
    modified: boolean
  } {
    if (this._applyUserBabelPlugins) {
      return this._applyUserBabelPlugins
    }
    const errors: unknown[] = []
    let modified = false
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (plugins.length === 0 && presets.length === 0) {
      this._applyUserBabelPlugins = { ok: true, errors, modified }
      return this._applyUserBabelPlugins
    }

    // Don't run user babel plugins (e.g. react-compiler) on third-party or framework-compiled
    // code: node_modules contains already-published packages, and packages/<pkg>/dist/ is
    // workspace framework output. Re-transforming them is wasted work and risks breaking
    // already-emitted code shapes (e.g. rolldown's brace-elided if/else).
    // if (isNonUserCodePath(this.abs)) {
    //   this._applyUserBabelPlugins = { ok: true, errors, modified }
    //   return this._applyUserBabelPlugins
    // }

    try {
      // Regenerate code from the current AST and re-parse before running user babel plugins.
      // Earlier passes (shakeForEnv, optimizeGuardedExpressions, etc.) mutate the AST in place,
      // which leaves scope bindings stale. Plugins that rely on accurate scope information
      // (e.g. react-compiler) silently bail on a mutated AST. A clean parse here gives them
      // the structure they expect.
      //
      // Collect a source map for this regenerate step so toCode() can chain it (final → original).
      const preUserBabelResult = babelGenerator(this.ast, { sourceFileName: this.abs, sourceMaps: true }, this.content)
      const regeneratedCode = preUserBabelResult.code
      // Mirror the primary parse()'s syntax plugin list so we can re-parse files that use
      // decorators / class private fields / etc. without throwing. We deliberately OMIT
      // `tokens` and `createParenthesizedExpressions` here (unlike the primary parse): some
      // plugins — notably babel-plugin-react-compiler — bail when paren nodes are present in the
      // AST, so we want them OFF for this re-parse path.
      const reparsedAst = babel.parse(regeneratedCode, {
        sourceType: 'module',
        errorRecovery: true,
        plugins: [
          'typescript',
          'jsx',
          'decorators-legacy',
          'classProperties',
          'classPrivateProperties',
          'classPrivateMethods',
          'throwExpressions',
        ],
      })
      const result = transformFromAstSync(reparsedAst, regeneratedCode, {
        ast: true,
        code: false,
        configFile: false,
        babelrc: false,
        filename: this.abs,
        plugins,
        presets,
      })
      if (!result?.ast) {
        this._applyUserBabelPlugins = { ok: true, errors, modified }
        return this._applyUserBabelPlugins
      }
      this.ast.program = result.ast.program
      this.content = regeneratedCode as THasContent extends true ? string : undefined
      this._preUserBabelMap = preUserBabelResult.map
      this._isIdentifierExists = {}
      modified = true
      this.modified = true
      this._applyUserBabelPlugins = { ok: true, errors, modified }
      return this._applyUserBabelPlugins
    } catch (e) {
      errors.push(e)
      this._applyUserBabelPlugins = { ok: false, errors, modified }
      return this._applyUserBabelPlugins
    }
  }

  private pruneUnusedImports({ ast }: { ast: File }): void {
    traverse(ast, {
      Program: (path) => {
        path.scope.crawl()
        for (const statement of path.get('body')) {
          if (!statement.isImportDeclaration()) {
            continue
          }
          if (statement.node.specifiers.length === 0) {
            continue
          }
          const preservedSpecifiers = statement.node.specifiers.filter((specifier) => {
            const localName = specifier.local.name
            const binding = statement.scope.getBinding(localName)
            return !!binding?.referenced
          })
          if (preservedSpecifiers.length === statement.node.specifiers.length) {
            continue
          }
          if (preservedSpecifiers.length === 0) {
            statement.remove()
            continue
          }
          statement.node.specifiers = preservedSpecifiers
        }
      },
    })
  }

  async toPrettyCode(): Promise<string> {
    const { code } = this.toCode()
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
        side: 'client' | 'server' | false
        mode: NormalizedNodeEnv | false
        runtime: EnvRuntimeName | false
        os: EnvOsName | false
        built: boolean
        scope: string | false
        // can be env name like NODE_ENV, or string SOMETHING_* then we should force value for all const started with SOMETHING_
        // also object like { NODE_ENV: 'production', NUM: 1, BOOL: true, NULL: null, UNDEFINED: undefined } can be provided
        consts: CompilerEnvConsts
        errors: unknown[]
        ok: boolean
        modified: boolean
        ssr: boolean
      }
    | undefined = undefined
  shakeForEnv({
    side,
    scope,
    consts = undefined,
    built = false,
    mode,
    runtime = false,
    os = false,
    ssr = false,
    processEnvAliases = [],
  }: {
    side: 'client' | 'server' | false
    scope: string | false
    mode: NormalizedNodeEnv | false
    runtime?: EnvRuntimeName | false
    os?: EnvOsName | false
    consts?: CompilerEnvConsts | undefined
    built?: boolean | undefined
    ssr?: boolean | undefined
    processEnvAliases?: string[] | undefined
  }): {
    side: 'client' | 'server' | false
    built: boolean
    scope: string | false
    mode: NormalizedNodeEnv | false
    runtime: EnvRuntimeName | false
    os: EnvOsName | false
    consts: CompilerEnvConsts
    errors: unknown[]
    ok: boolean
    modified: boolean
    ssr: boolean
  } {
    const errors: unknown[] = []
    consts = normalizeEnvConsts(consts)
    consts = [...consts].reverse() // for winning last match
    if (mode !== false) {
      consts.unshift({ NODE_ENV: mode })
    }
    if (side !== false) {
      consts.unshift({ POINT0_SIDE: side })
    }
    if (scope !== false) {
      consts.unshift({ POINT0_SCOPE: scope })
    }
    if (runtime !== false) {
      consts.unshift({ POINT0_RUNTIME: runtime })
    }
    if (os !== false) {
      consts.unshift({ POINT0_OS: os })
    }
    consts.unshift({ POINT0_SSR: ssr ? 'true' : 'false' })
    let modified = false
    if (this.content === undefined) {
      throw new Error(`File ${this.abs} is not read yet`)
    }
    if (this._shakeForEnv) {
      if (side !== false && this._shakeForEnv.side !== side) {
        throw new Error(`Already shaked for side ${this._shakeForEnv.side}`)
      }
      if (scope !== false && this._shakeForEnv.scope !== scope) {
        throw new Error(`Already shaked for scope ${this._shakeForEnv.scope}`)
      }
      if (mode !== false && this._shakeForEnv.mode !== mode) {
        throw new Error(`Already shaked for mode ${this._shakeForEnv.mode}`)
      }
      if (runtime !== false && this._shakeForEnv.runtime !== runtime) {
        throw new Error(`Already shaked for runtime ${this._shakeForEnv.runtime}`)
      }
      if (os !== false && this._shakeForEnv.os !== os) {
        throw new Error(`Already shaked for os ${this._shakeForEnv.os}`)
      }
      return this._shakeForEnv
    }
    try {
      const hasKnownEnvUsages =
        this.content.includes('@point0/core') ||
        this.content.includes('_point0_env') ||
        this.content.includes('process.env') ||
        this.content.includes('import.meta.env') ||
        processEnvAliases.some((alias) => this.content!.includes(alias))
      if (!hasKnownEnvUsages) {
        const resultSide = side !== false ? side : 'client'
        const resultScope = scope !== false ? scope : ''
        const resultRuntime = runtime
        const resultOs = os
        this._shakeForEnv = {
          side: resultSide,
          scope: resultScope,
          mode,
          runtime: resultRuntime,
          os: resultOs,
          consts,
          built,
          errors,
          ok: true,
          modified,
          ssr,
        }
        return this._shakeForEnv
      }

      const makeUndefined = (): t.Identifier => t.identifier('undefined')

      const makeStringLiteral = (value: string): t.StringLiteral => t.stringLiteral(value)

      const makeBooleanLiteral = (value: boolean): t.BooleanLiteral => t.booleanLiteral(value)

      const makeNumericLiteral = (value: number): t.NumericLiteral => t.numericLiteral(value)

      const makeNullLiteral = (): t.NullLiteral => t.nullLiteral()

      const makeThrowingArrowFunction = (message: string): t.ArrowFunctionExpression =>
        t.arrowFunctionExpression(
          [],
          t.blockStatement([t.throwStatement(t.newExpression(t.identifier('Error'), [t.stringLiteral(message)]))]),
          false,
        )
      const processEnvAliasSet = new Set(processEnvAliases)
      const trustPoint0IdentifiersInMdxLikeFile = CompilerFile.isMdxLikePath(this.abs)

      const isPoint0CoreModuleLoadExpression = (node: Node | null | undefined): boolean => {
        if (!node) {
          return false
        }
        if (t.isAwaitExpression(node)) {
          return isPoint0CoreModuleLoadExpression(node.argument)
        }
        if (
          t.isParenthesizedExpression(node) ||
          t.isTSAsExpression(node) ||
          t.isTSTypeAssertion(node) ||
          t.isTSNonNullExpression(node)
        ) {
          return isPoint0CoreModuleLoadExpression(node.expression)
        }
        if (t.isImportExpression(node)) {
          return t.isStringLiteral(node.source) && node.source.value === '@point0/core'
        }
        if (!t.isCallExpression(node)) {
          return false
        }

        // require('@point0/core')
        if (t.isIdentifier(node.callee) && node.callee.name === 'require') {
          const firstArg = node.arguments.at(0)
          return (
            node.arguments.length === 1 &&
            !!firstArg &&
            t.isStringLiteral(firstArg) &&
            firstArg.value === '@point0/core'
          )
        }

        // import('@point0/core')
        if (t.isImport(node.callee)) {
          const firstArg = node.arguments.at(0)
          return (
            node.arguments.length === 1 &&
            !!firstArg &&
            t.isStringLiteral(firstArg) &&
            firstArg.value === '@point0/core'
          )
        }
        return false
      }

      const isBindingStrictlyFromPoint0Core = ({
        usagePath,
        localName,
        importedName,
      }: {
        usagePath: NodePath<Node>
        localName: string
        importedName: string
      }): boolean => {
        if (localName === '_point0_env') {
          return true
        }
        if (
          trustPoint0IdentifiersInMdxLikeFile &&
          localName === importedName &&
          (importedName === 'env' || importedName === 'ClientOnly')
        ) {
          return true
        }
        const binding = usagePath.scope.getBinding(localName)
        if (!binding?.constant) {
          return false
        }

        if (binding.path.isImportSpecifier()) {
          const spec = binding.path.node
          const parent = binding.path.parentPath
          if (!parent.isImportDeclaration()) {
            return false
          }
          if (parent.node.source.value !== '@point0/core') {
            return false
          }
          const imported = spec.imported.type === 'Identifier' ? spec.imported.name : spec.imported.value
          return imported === importedName
        }

        // Support destructured env import pattern:
        // const { env } = require('@point0/core')
        // const { env } = await import('@point0/core')
        if (importedName === 'env' && binding.path.isVariableDeclarator()) {
          const declarator = binding.path.node
          if (!isPoint0CoreModuleLoadExpression(declarator.init)) {
            return false
          }
          if (!t.isObjectPattern(declarator.id)) {
            return false
          }
          for (const property of declarator.id.properties) {
            if (!t.isObjectProperty(property) || property.computed) {
              continue
            }
            const importedKeyName = t.isIdentifier(property.key)
              ? property.key.name
              : t.isStringLiteral(property.key)
                ? property.key.value
                : ''
            if (importedKeyName !== importedName) {
              continue
            }
            if (t.isIdentifier(property.value) && property.value.name === localName) {
              return true
            }
            if (
              t.isAssignmentPattern(property.value) &&
              t.isIdentifier(property.value.left) &&
              property.value.left.name === localName
            ) {
              return true
            }
          }
          return false
        }

        return false
      }

      const isTrustedEnvIdentifier = (usagePath: NodePath<Node>, envIdentifierName: string): boolean =>
        isBindingStrictlyFromPoint0Core({
          usagePath,
          localName: envIdentifierName,
          importedName: 'env',
        })

      const isTrustedClientOnlyIdentifier = (usagePath: NodePath<Node>, clientOnlyIdentifierName: string): boolean =>
        isBindingStrictlyFromPoint0Core({
          usagePath,
          localName: clientOnlyIdentifierName,
          importedName: 'ClientOnly',
        })

      const replaceClientOnlyChildrenWithNullInProps = (props: ObjectExpression): boolean => {
        for (const prop of props.properties) {
          if (!t.isObjectProperty(prop) || prop.computed) {
            continue
          }
          const keyName = t.isIdentifier(prop.key) ? prop.key.name : t.isStringLiteral(prop.key) ? prop.key.value : ''
          if (keyName !== 'children') {
            continue
          }
          if (t.isNullLiteral(prop.value)) {
            return false
          }
          prop.value = t.nullLiteral()
          return true
        }
        return false
      }

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

      const maxShakeForEnvPasses = 8
      for (let pass = 0; pass < maxShakeForEnvPasses; pass++) {
        let passModified = false as boolean

        const replaceWithConst = (
          p: { replaceWith: (node: t.Node) => void },
          desiredValue: string | number | boolean | null | undefined,
        ) => {
          if (typeof desiredValue === 'string') {
            p.replaceWith(makeStringLiteral(desiredValue))
          } else if (typeof desiredValue === 'number') {
            p.replaceWith(makeNumericLiteral(desiredValue))
          } else if (typeof desiredValue === 'boolean') {
            p.replaceWith(makeBooleanLiteral(desiredValue))
          } else if (desiredValue === null) {
            p.replaceWith(makeNullLiteral())
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          } else if (desiredValue === undefined) {
            p.replaceWith(makeUndefined())
          } else {
            return
          }
          modified = true
          passModified = true
        }

        traverse(this.ast, {
          JSXElement: (p) => {
            const node = p.node
            if (
              side === 'server' &&
              t.isJSXIdentifier(node.openingElement.name) &&
              node.openingElement.name.name === 'ClientOnly' &&
              isTrustedClientOnlyIdentifier(p, node.openingElement.name.name)
            ) {
              const alreadyNullOnlyChildren =
                node.children.length === 1 &&
                t.isJSXExpressionContainer(node.children[0]) &&
                t.isNullLiteral(node.children[0].expression)
              if (alreadyNullOnlyChildren) {
                return
              }
              node.children = [t.jsxExpressionContainer(t.nullLiteral())]
              modified = true
              passModified = true
            }
          },
          MemberExpression: (p) => {
            const node = p.node
            const isTrustedEnvRootIdentifier = (identifierName: string) => isTrustedEnvIdentifier(p, identifierName)

            // Handle env.side is.client/is.server
            if (
              side !== false &&
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'MemberExpression' &&
              node.object.object.object.type === 'Identifier' &&
              (node.object.object.object.name === 'env' || node.object.object.object.name === '_point0_env') &&
              node.object.object.property.type === 'Identifier' &&
              node.object.object.property.name === 'side' &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'is' &&
              isTrustedEnvRootIdentifier(node.object.object.object.name)
            ) {
              if (node.property.type === 'Identifier') {
                const name = node.property.name
                if (name === 'client') {
                  p.replaceWith(makeBooleanLiteral(side === 'client'))
                  modified = true
                  passModified = true
                } else if (name === 'server') {
                  p.replaceWith(makeBooleanLiteral(side === 'server'))
                  modified = true
                  passModified = true
                } else if (name === 'ssr') {
                  // If side is client, ssr is always false.
                  // If side is server, leave it as-is (it is resolved by runtime getter).
                  if (side === 'client') {
                    p.replaceWith(makeBooleanLiteral(false))
                    modified = true
                    passModified = true
                  }
                  // Note: For server side, env.side.is.ssr is a getter, so we leave it as-is.
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
              node.property.name === 'name' &&
              isTrustedEnvRootIdentifier(node.object.object.name)
            ) {
              p.replaceWith(makeStringLiteral(mode))
              modified = true
              passModified = true
            }
            // Handle env.build.was
            else if (
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'Identifier' &&
              (node.object.object.name === 'env' || node.object.object.name === '_point0_env') &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'build' &&
              node.property.type === 'Identifier' &&
              node.property.name === 'was' &&
              isTrustedEnvRootIdentifier(node.object.object.name)
            ) {
              p.replaceWith(makeBooleanLiteral(built))
              modified = true
              passModified = true
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
              node.object.property.name === 'is' &&
              isTrustedEnvRootIdentifier(node.object.object.object.name)
            ) {
              if (node.property.type === 'Identifier') {
                const name = node.property.name
                if (name === 'production') {
                  p.replaceWith(makeBooleanLiteral(isProduction))
                  modified = true
                  passModified = true
                } else if (name === 'development') {
                  p.replaceWith(makeBooleanLiteral(isDevelopment))
                  modified = true
                  passModified = true
                } else if (name === 'test') {
                  p.replaceWith(makeBooleanLiteral(isTest))
                  modified = true
                  passModified = true
                }
              }
            }
            // Handle env.runtime.name
            else if (
              runtime !== false &&
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'Identifier' &&
              (node.object.object.name === 'env' || node.object.object.name === '_point0_env') &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'runtime' &&
              node.property.type === 'Identifier' &&
              node.property.name === 'name' &&
              isTrustedEnvRootIdentifier(node.object.object.name)
            ) {
              p.replaceWith(makeStringLiteral(runtime))
              modified = true
              passModified = true
            }
            // Handle env.runtime.is.*
            else if (
              runtime !== false &&
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'MemberExpression' &&
              node.object.object.object.type === 'Identifier' &&
              (node.object.object.object.name === 'env' || node.object.object.object.name === '_point0_env') &&
              node.object.object.property.type === 'Identifier' &&
              node.object.object.property.name === 'runtime' &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'is' &&
              node.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(node.object.object.object.name)
            ) {
              p.replaceWith(makeBooleanLiteral(runtime === node.property.name))
              modified = true
              passModified = true
            }
            // Handle env.os.name
            else if (
              os !== false &&
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'Identifier' &&
              (node.object.object.name === 'env' || node.object.object.name === '_point0_env') &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'os' &&
              node.property.type === 'Identifier' &&
              node.property.name === 'name' &&
              isTrustedEnvRootIdentifier(node.object.object.name)
            ) {
              p.replaceWith(makeStringLiteral(os))
              modified = true
              passModified = true
            }
            // Handle env.os.is.*
            else if (
              os !== false &&
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'MemberExpression' &&
              node.object.object.object.type === 'Identifier' &&
              (node.object.object.object.name === 'env' || node.object.object.object.name === '_point0_env') &&
              node.object.object.property.type === 'Identifier' &&
              node.object.object.property.name === 'os' &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'is' &&
              node.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(node.object.object.object.name)
            ) {
              p.replaceWith(makeBooleanLiteral(os === node.property.name))
              modified = true
              passModified = true
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
              node.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(node.object.object.object.name)
            ) {
              const scopeName = node.property.name
              p.replaceWith(makeBooleanLiteral(scope === scopeName))
              modified = true
              passModified = true
            }
            // Handle env.vars.X - replace if X is in consts
            else if (
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'Identifier' &&
              (node.object.object.name === 'env' || node.object.object.name === '_point0_env') &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'vars' &&
              node.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(node.object.object.name)
            ) {
              const varName = node.property.name
              const checkResult = checkReplaceVar(varName, process.env[varName])
              if (checkResult.shouldReplace) {
                replaceWithConst(p, checkResult.desiredValue)
              }
            }
            // Handle process.env.X - replace if X is in consts
            else if (
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'Identifier' &&
              node.object.object.name === 'process' &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'env' &&
              ((node.computed === false && node.property.type === 'Identifier') ||
                (node.computed === true && node.property.type === 'StringLiteral'))
            ) {
              const varName = node.property.type === 'Identifier' ? node.property.name : node.property.value
              const checkResult = checkReplaceVar(varName, process.env[varName])
              if (checkResult.shouldReplace) {
                replaceWithConst(p, checkResult.desiredValue)
              }
            }
            // Handle alias.X where alias is configured as process env alias
            else if (
              node.object.type === 'Identifier' &&
              processEnvAliasSet.has(node.object.name) &&
              ((node.computed === false && node.property.type === 'Identifier') ||
                (node.computed === true && node.property.type === 'StringLiteral'))
            ) {
              const varName = node.property.type === 'Identifier' ? node.property.name : node.property.value
              const checkResult = checkReplaceVar(varName, process.env[varName])
              if (checkResult.shouldReplace) {
                replaceWithConst(p, checkResult.desiredValue)
              }
            }
            // Handle import.meta.env.X - replace if X is in consts
            else if (
              node.object.type === 'MemberExpression' &&
              node.object.object.type === 'MetaProperty' &&
              node.object.object.meta.name === 'import' &&
              node.object.object.property.name === 'meta' &&
              node.object.property.type === 'Identifier' &&
              node.object.property.name === 'env' &&
              ((node.computed === false && node.property.type === 'Identifier') ||
                (node.computed === true && node.property.type === 'StringLiteral'))
            ) {
              const varName = node.property.type === 'Identifier' ? node.property.name : node.property.value
              const checkResult = checkReplaceVar(varName, process.env[varName])
              if (checkResult.shouldReplace) {
                replaceWithConst(p, checkResult.desiredValue)
              }
            }
          },

          CallExpression: (p) => {
            const node = p.node
            const callee = node.callee
            const args = node.arguments
            const isTrustedEnvRootIdentifier = (identifierName: string) => isTrustedEnvIdentifier(p, identifierName)

            // Handle MDX-style jsx factory call for <ClientOnly>...</ClientOnly>:
            // _jsxDEV(ClientOnly, { children: ... })
            if (
              side === 'server' &&
              t.isIdentifier(callee) &&
              t.isIdentifier(args[0]) &&
              args[0].name === 'ClientOnly' &&
              isTrustedClientOnlyIdentifier(p, args[0].name) &&
              t.isObjectExpression(args[1])
            ) {
              const didReplace = replaceClientOnlyChildrenWithNullInProps(args[1])
              if (didReplace) {
                modified = true
                passModified = true
              }
            }

            if (callee.type !== 'MemberExpression') return
            const replaceWithFinalValue = (value: Node | undefined) => {
              p.replaceWith(value ?? makeUndefined())
              modified = true
              passModified = true
            }
            const getObjectPropertyValue = (objectExpression: ObjectExpression, key: string) => {
              const props = objectExpression.properties
              for (const prop of props) {
                if (prop.type !== 'ObjectProperty') continue
                if (prop.key.type === 'Identifier' && prop.key.name === key) {
                  return prop.value
                }
                if (prop.key.type === 'StringLiteral' && prop.key.value === key) {
                  return prop.value
                }
              }
              return undefined
            }

            // Handle superstore hydrate and dehydrate
            if (
              side !== false &&
              callee.object.type === 'Identifier' &&
              callee.object.name === 'superstore' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'define' &&
              args.length > 2 &&
              args[2]?.type === 'ObjectExpression'
            ) {
              const ssrConfig = args[2]
              const hasHydrate = ssrConfig.properties.some(
                (prop) =>
                  prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === 'hydrate',
              )
              const hasDehydrate = ssrConfig.properties.some(
                (prop: ObjectMethod | ObjectProperty | SpreadElement) =>
                  prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === 'dehydrate',
              )

              if (hasHydrate && hasDehydrate) {
                for (const prop of ssrConfig.properties) {
                  if (prop.type !== 'ObjectProperty' || prop.key.type !== 'Identifier') {
                    continue
                  }
                  if (side === 'server' && prop.key.name === 'hydrate') {
                    prop.value = makeThrowingArrowFunction('Not available on server')
                    modified = true
                    passModified = true
                  } else if (side === 'client' && prop.key.name === 'dehydrate') {
                    prop.value = makeThrowingArrowFunction('Not available on client')
                    modified = true
                    passModified = true
                  }
                }
              }
            }

            // Handle env.side define.server()/define.client()
            else if (
              side !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'MemberExpression' &&
              callee.object.object.object.type === 'Identifier' &&
              (callee.object.object.object.name === 'env' || callee.object.object.object.name === '_point0_env') &&
              callee.object.object.property.type === 'Identifier' &&
              callee.object.object.property.name === 'side' &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'define' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.name)
            ) {
              if (callee.property.type === 'Identifier') {
                const name = callee.property.name

                if (name === 'server') {
                  replaceWithFinalValue(side === 'server' ? args[0] : undefined)
                } else if (name === 'client') {
                  replaceWithFinalValue(side === 'client' ? args[0] : undefined)
                }
              }
            }
            // Handle env.side define.unsafe.server()/define.unsafe.client()
            else if (
              side !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'MemberExpression' &&
              callee.object.object.object.type === 'MemberExpression' &&
              callee.object.object.object.object.type === 'Identifier' &&
              (callee.object.object.object.object.name === 'env' ||
                callee.object.object.object.object.name === '_point0_env') &&
              callee.object.object.object.property.type === 'Identifier' &&
              callee.object.object.object.property.name === 'side' &&
              callee.object.object.property.type === 'Identifier' &&
              callee.object.object.property.name === 'define' &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'unsafe' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.object.name)
            ) {
              if (callee.property.type === 'Identifier') {
                const name = callee.property.name

                if (name === 'server') {
                  replaceWithFinalValue(side === 'server' ? args[0] : undefined)
                } else if (name === 'client') {
                  replaceWithFinalValue(side === 'client' ? args[0] : undefined)
                }
              }
            }
            // Handle env.runtime.define.X() - replace with value if runtime matches, undefined otherwise
            else if (
              runtime !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'MemberExpression' &&
              callee.object.object.object.type === 'Identifier' &&
              (callee.object.object.object.name === 'env' || callee.object.object.object.name === '_point0_env') &&
              callee.object.object.property.type === 'Identifier' &&
              callee.object.object.property.name === 'runtime' &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'define' &&
              callee.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.name)
            ) {
              const runtimeName = callee.property.name
              replaceWithFinalValue(runtime === runtimeName ? args[0] : undefined)
            }
            // Handle env.runtime.define.unsafe.X() - replace with value if runtime matches, undefined otherwise
            else if (
              runtime !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'MemberExpression' &&
              callee.object.object.object.type === 'MemberExpression' &&
              callee.object.object.object.object.type === 'Identifier' &&
              (callee.object.object.object.object.name === 'env' ||
                callee.object.object.object.object.name === '_point0_env') &&
              callee.object.object.object.property.type === 'Identifier' &&
              callee.object.object.object.property.name === 'runtime' &&
              callee.object.object.property.type === 'Identifier' &&
              callee.object.object.property.name === 'define' &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'unsafe' &&
              callee.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.object.name)
            ) {
              const runtimeName = callee.property.name
              replaceWithFinalValue(runtime === runtimeName ? args[0] : undefined)
            }
            // Handle env.runtime.define() with options object
            else if (
              runtime !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'Identifier' &&
              (callee.object.object.name === 'env' || callee.object.object.name === '_point0_env') &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'runtime' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'define' &&
              isTrustedEnvRootIdentifier(callee.object.object.name)
            ) {
              if (args.length > 0 && args[0].type === 'ObjectExpression') {
                replaceWithFinalValue(getObjectPropertyValue(args[0], runtime))
              }
            }
            // Handle env.os.define.X() - replace with value if os matches, undefined otherwise
            else if (
              os !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'MemberExpression' &&
              callee.object.object.object.type === 'Identifier' &&
              (callee.object.object.object.name === 'env' || callee.object.object.object.name === '_point0_env') &&
              callee.object.object.property.type === 'Identifier' &&
              callee.object.object.property.name === 'os' &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'define' &&
              callee.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.name)
            ) {
              const osName = callee.property.name
              replaceWithFinalValue(os === osName ? args[0] : undefined)
            }
            // Handle env.os.define.unsafe.X() - replace with value if os matches, undefined otherwise
            else if (
              os !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'MemberExpression' &&
              callee.object.object.object.type === 'MemberExpression' &&
              callee.object.object.object.object.type === 'Identifier' &&
              (callee.object.object.object.object.name === 'env' ||
                callee.object.object.object.object.name === '_point0_env') &&
              callee.object.object.object.property.type === 'Identifier' &&
              callee.object.object.object.property.name === 'os' &&
              callee.object.object.property.type === 'Identifier' &&
              callee.object.object.property.name === 'define' &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'unsafe' &&
              callee.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.object.name)
            ) {
              const osName = callee.property.name
              replaceWithFinalValue(os === osName ? args[0] : undefined)
            }
            // Handle env.os.define() with options object
            else if (
              os !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'Identifier' &&
              (callee.object.object.name === 'env' || callee.object.object.name === '_point0_env') &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'os' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'define' &&
              isTrustedEnvRootIdentifier(callee.object.object.name)
            ) {
              if (args.length > 0 && args[0].type === 'ObjectExpression') {
                replaceWithFinalValue(getObjectPropertyValue(args[0], os))
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
              callee.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.name)
            ) {
              const scopeName = callee.property.name
              replaceWithFinalValue(scope === scopeName ? args[0] : undefined)
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
              callee.property.type === 'Identifier' &&
              isTrustedEnvRootIdentifier(callee.object.object.object.object.name)
            ) {
              const scopeName = callee.property.name
              replaceWithFinalValue(scope === scopeName ? args[0] : undefined)
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
              callee.property.name === 'define' &&
              isTrustedEnvRootIdentifier(callee.object.object.name)
            ) {
              if (args.length > 0 && args[0].type === 'ObjectExpression') {
                replaceWithFinalValue(getObjectPropertyValue(args[0], scope))
              }
            }
            // Handle env.side define() with options object
            else if (
              side !== false &&
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'Identifier' &&
              (callee.object.object.name === 'env' || callee.object.object.name === '_point0_env') &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'side' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'define' &&
              isTrustedEnvRootIdentifier(callee.object.object.name)
            ) {
              if (args.length > 0 && args[0].type === 'ObjectExpression') {
                replaceWithFinalValue(getObjectPropertyValue(args[0], side))
              }
            }
            // Handle env.build.define() with options object
            else if (
              callee.object.type === 'MemberExpression' &&
              callee.object.object.type === 'Identifier' &&
              (callee.object.object.name === 'env' || callee.object.object.name === '_point0_env') &&
              callee.object.property.type === 'Identifier' &&
              callee.object.property.name === 'build' &&
              callee.property.type === 'Identifier' &&
              callee.property.name === 'define' &&
              isTrustedEnvRootIdentifier(callee.object.object.name)
            ) {
              if (args.length > 0 && args[0].type === 'ObjectExpression') {
                replaceWithFinalValue(getObjectPropertyValue(args[0], built ? 'after' : 'before'))
              }
            }
          },
        })
        if (!passModified) break
      }

      this._shakeForEnv = { side, scope, mode, runtime, os, consts, built, errors, ok: true, modified, ssr }
      this.modified ||= modified
      return this._shakeForEnv
    } catch (e) {
      errors.push(e)
      this._shakeForEnv = { side, scope, mode, runtime, os, consts, built, errors, ok: false, modified, ssr }
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
    if (this.content === undefined) {
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
      const makeObjectExpression = (): t.ObjectExpression => t.objectExpression([])

      const makeArrayExpression = (): t.ArrayExpression => t.arrayExpression([])

      const processObjectExpression = (objExpr: ObjectExpression): void => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (objExpr.type !== 'ObjectExpression') return

        const propertiesToReplace = [
          { name: 'viteConfig', value: makeObjectExpression() },
          { name: 'bunBuildConfig', value: makeObjectExpression() },
          { name: 'bunPlugins', value: makeArrayExpression() },
          // The compiler config (markdown/babel plugins, importer fns, consts, etc.) is only
          // consulted at build/dev time via getCompilerOptions(). A built engine never compiles
          // sources at runtime, so dropping it avoids bundling babel/remark plugin closures into
          // the production bundle. `false` is the canonical "no compiler" sentinel.
          { name: 'compiler', value: t.booleanLiteral(false) },
        ]

        // Process properties in this object
        for (const propToReplace of propertiesToReplace) {
          const propIndex = objExpr.properties.findIndex(
            (prop: ObjectMethod | ObjectProperty | SpreadElement) =>
              prop.type === 'ObjectProperty' && prop.key.type === 'Identifier' && prop.key.name === propToReplace.name,
          )

          if (propIndex !== -1) {
            const prop = objExpr.properties[propIndex]
            if (prop.type === 'ObjectProperty') {
              prop.value = propToReplace.value
              modified = true
            }
          }
        }

        // Recursively process nested objects (server, clients array elements, etc.)
        for (const prop of objExpr.properties) {
          if (prop.type === 'ObjectProperty') {
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

  _collectImports: { ok: boolean; errors: unknown[]; imports: CompilerFileImport[] } | undefined = undefined
  _collectImportsWithoutExportNames: { ok: boolean; errors: unknown[]; imports: CompilerFileImport[] } | undefined =
    undefined
  collectImports({
    includeExportNames = false,
  }: {
    includeExportNames?: boolean
  } = {}): { ok: boolean; errors: unknown[]; imports: CompilerFileImport[] } {
    if (includeExportNames && this._collectImports) {
      return this._collectImports
    }
    if (!includeExportNames && this._collectImportsWithoutExportNames) {
      return this._collectImportsWithoutExportNames
    }
    const errors: unknown[] = []
    const importsByPath = new Map<string, CompilerFileImport>()

    try {
      const resolveImportLoc = (sourceNodePath?: NodePath<t.StringLiteral>): { line: number; column: number } => {
        const loc = sourceNodePath?.node.loc?.start
        if (!loc) {
          return { line: 0, column: 0 }
        }
        return { line: loc.line, column: loc.column }
      }

      const addImport = ({
        pathOriginal,
        sourceNodePath,
      }: {
        pathOriginal: string
        sourceNodePath?: NodePath<t.StringLiteral>
      }): void => {
        const pathResolved = FileResolver.resolveFilePath({
          path: pathOriginal,
          importer: this.abs,
          existsing: false,
        })
        const key = `${pathOriginal}\n${pathResolved ?? ''}`
        const existing = importsByPath.get(key)
        if (!existing) {
          const next: CompilerFileImport = {
            pathOriginal,
            pathResolved,
            exportNames: [],
            virtualPath: undefined,
            loc: resolveImportLoc(sourceNodePath),
            sourceNodePaths: sourceNodePath ? [sourceNodePath] : [],
          }
          importsByPath.set(key, next)
          return
        }
        if (sourceNodePath && !existing.sourceNodePaths.includes(sourceNodePath)) {
          existing.sourceNodePaths.push(sourceNodePath)
        }
        if (existing.loc.line === 0) {
          existing.loc = resolveImportLoc(sourceNodePath)
        }
      }

      traverse(this.ast, {
        ImportDeclaration: (p) => {
          const pathOriginal = p.node.source.value
          const sourceNodePath = p.get('source')
          addImport({ pathOriginal, sourceNodePath })
        },
        CallExpression: (p) => {
          // import('...')
          if (t.isImport(p.node.callee) && p.node.arguments.length > 0 && t.isStringLiteral(p.node.arguments[0])) {
            const pathOriginal = p.node.arguments[0].value
            const sourceNodePath = p.get('arguments')[0]
            if (!sourceNodePath.isStringLiteral()) {
              addImport({ pathOriginal })
              return
            }
            addImport({ pathOriginal, sourceNodePath })
            return
          }

          // require('...')
          if (
            t.isIdentifier(p.node.callee) &&
            p.node.callee.name === 'require' &&
            p.node.arguments.length > 0 &&
            t.isStringLiteral(p.node.arguments[0])
          ) {
            const pathOriginal = p.node.arguments[0].value
            const sourceNodePath = p.get('arguments')[0]
            if (!sourceNodePath.isStringLiteral()) {
              addImport({ pathOriginal })
              return
            }
            addImport({ pathOriginal, sourceNodePath })
          }
        },
      })

      const imports = [...importsByPath.values()]
      if (includeExportNames) {
        for (const importItem of imports) {
          this.collectExportNamesForImport(importItem)
        }
      }
      this.imports = imports
      const result = { ok: true, errors, imports }
      if (includeExportNames) {
        this._collectImports = result
      } else {
        this._collectImportsWithoutExportNames = result
      }
      return result
    } catch (e) {
      errors.push(e)
      const imports = [...importsByPath.values()]
      if (includeExportNames) {
        for (const importItem of imports) {
          this.collectExportNamesForImport(importItem)
        }
      }
      this.imports = imports
      const result = { ok: false, errors, imports }
      if (includeExportNames) {
        this._collectImports = result
      } else {
        this._collectImportsWithoutExportNames = result
      }
      return result
    }
  }

  private collectNamespaceUsedNames({
    scope,
    localName,
  }: {
    scope: NodePath<Node>['scope']
    localName: string
  }): string[] {
    const used = new Set<string>()
    const binding = scope.getBinding(localName)
    if (!binding) {
      return []
    }
    for (const referencePath of binding.referencePaths) {
      const parentPath = referencePath.parentPath
      if (
        parentPath?.isMemberExpression() &&
        parentPath.get('object') === referencePath &&
        !parentPath.node.computed &&
        t.isIdentifier(parentPath.node.property)
      ) {
        const propName = parentPath.node.property.name
        if (propName !== 'default') {
          used.add(propName)
        }
        continue
      }
      if (
        parentPath?.isMemberExpression() &&
        parentPath.get('object') === referencePath &&
        parentPath.node.computed &&
        t.isStringLiteral(parentPath.node.property)
      ) {
        const propName = parentPath.node.property.value
        if (propName !== 'default') {
          used.add(propName)
        }
      }
    }
    return [...used]
  }

  private collectFromObjectPattern(pattern: t.ObjectPattern): string[] {
    const names = new Set<string>()
    for (const property of pattern.properties) {
      if (t.isObjectProperty(property)) {
        const key = property.key
        if (t.isIdentifier(key)) {
          if (key.name !== 'default') {
            names.add(key.name)
          }
        } else if (t.isStringLiteral(key)) {
          if (key.value !== 'default') {
            names.add(key.value)
          }
        }
      }
    }
    return [...names]
  }

  private collectFromModuleObjectBinding({
    scope,
    localName,
  }: {
    scope: NodePath<Node>['scope']
    localName: string
  }): string[] {
    const names = new Set<string>()
    const binding = scope.getBinding(localName)
    if (!binding) {
      return []
    }
    for (const referencePath of binding.referencePaths) {
      const parentPath = referencePath.parentPath
      if (
        parentPath?.isMemberExpression() &&
        parentPath.get('object') === referencePath &&
        !parentPath.node.computed &&
        t.isIdentifier(parentPath.node.property)
      ) {
        const name = parentPath.node.property.name
        if (name !== 'default') {
          names.add(name)
        }
        continue
      }
      if (
        parentPath?.isMemberExpression() &&
        parentPath.get('object') === referencePath &&
        parentPath.node.computed &&
        t.isStringLiteral(parentPath.node.property)
      ) {
        const name = parentPath.node.property.value
        if (name !== 'default') {
          names.add(name)
        }
      }
    }
    return [...names]
  }

  private collectFromVariableDeclarator(declaratorPath: NodePath<t.VariableDeclarator>): string[] {
    const id = declaratorPath.node.id
    if (t.isObjectPattern(id)) {
      return this.collectFromObjectPattern(id)
    }
    if (t.isIdentifier(id)) {
      return this.collectFromModuleObjectBinding({
        scope: declaratorPath.scope,
        localName: id.name,
      })
    }
    return []
  }

  private collectExportNamesForImport(importItem: CompilerFileImport): string[] {
    const exportNames = new Set<string>()

    for (const sourceNodePath of importItem.sourceNodePaths) {
      const parentPath = sourceNodePath.parentPath

      if (parentPath.isImportDeclaration()) {
        if (parentPath.node.importKind === 'type') {
          continue
        }
        for (const specifier of parentPath.node.specifiers) {
          if (t.isImportSpecifier(specifier)) {
            if (specifier.importKind === 'type') {
              continue
            }
            const imported = specifier.imported
            const exportName = t.isIdentifier(imported) ? imported.name : imported.value
            if (exportName !== 'default') {
              exportNames.add(exportName)
            }
            continue
          }
          if (t.isImportNamespaceSpecifier(specifier)) {
            const names = this.collectNamespaceUsedNames({
              scope: parentPath.scope,
              localName: specifier.local.name,
            })
            for (const name of names) {
              exportNames.add(name)
            }
          }
        }
        continue
      }

      if (!parentPath.isCallExpression()) {
        continue
      }

      const callPath = parentPath
      const callParentPath = callPath.parentPath

      if (callParentPath.isAwaitExpression()) {
        const maybeDeclaratorPath = callParentPath.parentPath
        if (maybeDeclaratorPath.isVariableDeclarator()) {
          const names = this.collectFromVariableDeclarator(maybeDeclaratorPath)
          for (const name of names) {
            exportNames.add(name)
          }
          continue
        }
      }

      if (callParentPath.isVariableDeclarator()) {
        const names = this.collectFromVariableDeclarator(callParentPath)
        for (const name of names) {
          exportNames.add(name)
        }
        continue
      }

      if (
        callParentPath.isMemberExpression() &&
        callParentPath.get('object') === callPath &&
        !callParentPath.node.computed &&
        t.isIdentifier(callParentPath.node.property)
      ) {
        const name = callParentPath.node.property.name
        if (name !== 'default') {
          exportNames.add(name)
        }
        continue
      }

      if (
        callParentPath.isMemberExpression() &&
        callParentPath.get('object') === callPath &&
        callParentPath.node.computed &&
        t.isStringLiteral(callParentPath.node.property)
      ) {
        const name = callParentPath.node.property.value
        if (name !== 'default') {
          exportNames.add(name)
        }
      }
    }

    importItem.exportNames = [...exportNames]
    return importItem.exportNames
  }

  private _applyImporter: { ok: boolean; errors: unknown[]; modified: boolean } | undefined = undefined
  applyImporter({
    importer,
    scope,
    side,
    writeVirtual = false,
    compiler,
  }: {
    importer: ImporterOptionsParsed
    scope: string | undefined
    side: 'client' | 'server'
    writeVirtual?: false | string
    compiler: Compiler
  }): { ok: boolean; errors: unknown[]; modified: boolean } {
    if (this._applyImporter) {
      return this._applyImporter
    }
    const errors: unknown[] = []
    let modified = false
    try {
      const collectImportsResult = this.collectImports({ includeExportNames: false })
      errors.push(...collectImportsResult.errors)
      for (const importItem of this.imports) {
        if (
          (side === 'server' && importItem.pathOriginal === '@point0/core/client-only') ||
          (side === 'client' && importItem.pathOriginal === '@point0/core/server-only')
        ) {
          const shortOriginalImporter = importer.cwd ? nodePath.relative(importer.cwd, this.abs) : this.abs
          const trace = compiler.trace({
            target: importItem.pathOriginal,
            policy: 'memory',
            cwd: importer.cwd,
          })
          this.replaceImportWithVirtualModulePath({
            importItem,
            virtualPath: writeOrCreateVirtualModulePath(
              {
                exportNames: [],
                importer: shortOriginalImporter,
                pathOriginal: importItem.pathOriginal,
                pathResolved: importItem.pathOriginal, // pathOriginal is correct here becouse we want just see '@point0/core/client-only', not d.ts file
                scope,
                side,
                deny: importItem.pathOriginal,
                trace: trace.found ? trace.trace : undefined,
              },
              { writeVirtual },
            ),
          })
          modified = true
          continue
        }

        const matchablePath = importItem.pathResolved ?? importItem.pathOriginal
        const denyResolved = resolveImporterRule({
          map: importer.map.deny,
          rules: importer.deny,
          path: matchablePath,
          importer: this.abs,
          cwd: importer.cwd,
          loc: importItem.loc,
        })
        if (denyResolved) {
          const exportNames = this.collectExportNamesForImport(importItem)
          const trace = compiler.trace({
            target: matchablePath,
            policy: 'memory',
            cwd: importer.cwd,
          })
          this.replaceImportWithVirtualModulePath({
            importItem,
            virtualPath: writeOrCreateVirtualModulePath(
              {
                exportNames,
                importer: denyResolved.shortImporter,
                pathOriginal: importItem.pathOriginal,
                pathResolved: denyResolved.shortPath,
                scope,
                side,
                deny: denyResolved.shortRule,
                trace: trace.found ? trace.trace : undefined,
              },
              { writeVirtual },
            ),
          })
          modified = true
          continue
        }

        const mockResolved = resolveImporterRule({
          map: importer.map.mock,
          rules: importer.mock,
          path: matchablePath,
          importer: this.abs,
          cwd: importer.cwd,
          loc: importItem.loc,
        })
        if (mockResolved) {
          const exportNames = this.collectExportNamesForImport(importItem)
          this.replaceImportWithVirtualModulePath({
            importItem,
            virtualPath: writeOrCreateVirtualModulePath(
              {
                exportNames,
                importer: undefined,
                pathOriginal: undefined,
                pathResolved: undefined,
                scope,
                side,
                deny: undefined,
                trace: undefined,
              },
              { writeVirtual },
            ),
          })
          modified = true
        }
      }
      this.modified ||= modified
      this._applyImporter = { ok: true, errors, modified }
      return this._applyImporter
    } catch (e) {
      errors.push(e)
      this.modified ||= modified
      this._applyImporter = { ok: false, errors, modified }
      return this._applyImporter
    }
  }

  replaceImportWithVirtualModulePath({
    importItem,
    virtualPath,
  }: {
    importItem: CompilerFileImport
    virtualPath: string
  }): void {
    if (importItem.virtualPath) {
      return
    }
    let astModified = false
    for (const sourceNodePath of importItem.sourceNodePaths) {
      if (sourceNodePath.node.value === virtualPath) {
        continue
      }
      sourceNodePath.replaceWith(t.stringLiteral(virtualPath))
      astModified = true
    }
    importItem.virtualPath = virtualPath
    this.modified ||= astModified
  }

  private _pathHash: string | undefined
  get pathHash(): string {
    if (this._pathHash) {
      return this._pathHash
    }
    this._pathHash = getHash(this.abs)
    return this._pathHash
  }

  getCacheFilePath({
    mtime,
    compiler,
    map,
    hmrFix,
  }: {
    mtime: number
    compiler: Compiler
    map: boolean
    hmrFix: boolean
  }): string {
    return nodePath.resolve(compiler.getCacheDir({ map, hmrFix }), this.pathHash + '.' + mtime)
  }

  getCache({ map, hmrFix, compiler }: { map: boolean; hmrFix: boolean; compiler: Compiler }): {
    stats: nodeFsSync.Stats | undefined
    result:
      | undefined
      | {
          code: string
          map: GeneratorResult['map']
          modified: boolean
          imports: ImportsTraceResult['items']
        }
  } {
    const stats = (() => {
      try {
        return nodeFsSync.statSync(this.abs)
      } catch {
        return undefined
      }
    })()
    if (!stats?.mtimeMs) {
      return {
        stats,
        result: undefined,
      }
    }
    const cacheFilePath = this.getCacheFilePath({ mtime: stats.mtimeMs, compiler, map, hmrFix })
    const cacheFileContent = (() => {
      try {
        return nodeFsSync.readFileSync(cacheFilePath, 'utf8')
      } catch {
        return undefined
      }
    })()
    if (!cacheFileContent) {
      return {
        stats,
        result: undefined,
      }
    }
    const result = (() => {
      try {
        return JSON.parse(cacheFileContent) as {
          code: string
          map: GeneratorResult['map']
          modified: boolean
          imports: ImportsTraceResult['items']
        }
      } catch {
        return undefined
      }
    })()
    if (!result) {
      try {
        nodeFsSync.unlinkSync(cacheFilePath)
      } catch {}
      return {
        stats,
        result: undefined,
      }
    }
    return {
      stats,
      result: {
        code: result.code,
        map: result.map,
        modified: result.modified,
        imports: result.imports,
      },
    }
  }

  writeCache({
    map,
    hmrFix,
    compiler,
    mtime,
    result,
  }: {
    map: boolean
    hmrFix: boolean
    compiler: Compiler
    mtime: number
    result: {
      code: string
      map: GeneratorResult['map']
      modified: boolean
      imports: ImportsTraceResult['items']
    }
  }): void {
    const cacheFilePath = this.getCacheFilePath({ mtime, compiler, map, hmrFix })
    nodeFsSync.writeFileSync(
      cacheFilePath,
      JSON.stringify({
        code: result.code,
        map: result.map,
        modified: result.modified,
        imports: result.imports,
      }),
      'utf8',
    )
    void this.removeStaleCacheAsync({ map, hmrFix, compiler, exclude: cacheFilePath })
  }

  async removeStaleCacheAsync({
    map,
    hmrFix,
    compiler,
    exclude,
  }: {
    map: boolean
    hmrFix: boolean
    compiler: Compiler
    exclude: string
  }): Promise<void> {
    const cacheDir = compiler.getCacheDir({ map, hmrFix })
    const pathHash = this.pathHash
    const staleCacheFilesGlob = nodePath.join(cacheDir, `${pathHash}.*`)
    const files = await fg(staleCacheFilesGlob, { dot: true })
    await Promise.all(
      files.map(async (file) => {
        if (file === exclude) {
          return
        }
        // return nodeFsAsync.unlink(file)
        try {
          await nodeFsAsync.unlink(file)
        } catch {
          /* ignore */
        }
      }),
    )
  }
}

export type CompilerFileImport = {
  pathOriginal: string
  pathResolved: string | undefined
  exportNames: string[]
  virtualPath: string | undefined
  loc: { line: number; column: number }
  sourceNodePaths: NodePath<t.StringLiteral>[]
}

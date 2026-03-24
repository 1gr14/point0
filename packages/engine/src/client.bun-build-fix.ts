import * as nodePath from 'node:path'

type BunMetafileOutputItem = {
  entryPoint?: string
  inputs?: Record<string, unknown>
}

type BunMetafile = {
  outputs?: Record<string, BunMetafileOutputItem>
}

/**
 * Why this helper exists:
 *
 * Bun's HTML bundling can occasionally produce `dist/index.html` that points to
 * a *valid* JS chunk that is not the intended client bootstrap module
 * (for example, a route/layout chunk instead of `index.client.ts` output).
 *
 * Result in browser:
 * - SSR HTML is visible (server output is correct)
 * - JS files are loaded (200 OK, no syntax/runtime error)
 * - hydration never starts because bootstrap code is not executed
 *
 * This helper makes the output deterministic after build:
 * 1) Read source `index.html` and collect its `<script type="module" src="...">` entries.
 * 2) Use Bun metafile outputs to find which emitted JS chunk actually includes each source module input.
 * 3) Rewrite corresponding module script src values in `dist/index.html`.
 *
 * Important design constraints:
 * - It is post-build and non-invasive: we do not change app code or compiler transforms.
 * - It is safe to no-op: if mapping cannot be resolved, original dist HTML is preserved.
 * - It handles hashed filenames and code splitting naturally via metafile graph.
 */
export async function fixDistIndexHtmlBootstrapEntryByBunMetafile({
  sourceIndexHtmlPath,
  distOutdir,
  buildOutput,
}: {
  sourceIndexHtmlPath: string
  distOutdir: string
  buildOutput: { metafile?: unknown }
}): Promise<void> {
  const metafile = toMetafileOrNull(buildOutput.metafile)
  if (!metafile?.outputs) {
    return
  }

  const sourceIndexHtml = await Bun.file(sourceIndexHtmlPath).text()
  const sourceModuleScriptSrcs = getModuleScriptSrcs(sourceIndexHtml)
  if (sourceModuleScriptSrcs.length === 0) {
    return
  }

  const mappedBuiltPublicScriptPaths = sourceModuleScriptSrcs.map((sourceScriptSrc) => {
    const sourceScriptPath = resolveModuleScriptSourcePathFromIndexHtml(sourceIndexHtmlPath, sourceScriptSrc)
    if (!sourceScriptPath) {
      return null
    }
    return findBuiltChunkPublicPathForModuleScript({
      sourceIndexHtmlPath,
      moduleScriptSourcePath: sourceScriptPath,
      metafile,
    })
  })
  if (mappedBuiltPublicScriptPaths.every((path) => !path)) {
    return
  }

  const distIndexHtmlPath = nodePath.join(distOutdir, nodePath.basename(sourceIndexHtmlPath))
  if (!(await Bun.file(distIndexHtmlPath).exists())) {
    return
  }

  const distIndexHtml = await Bun.file(distIndexHtmlPath).text()
  let fixedDistIndexHtml = distIndexHtml
  for (const [scriptIndex, mappedPath] of mappedBuiltPublicScriptPaths.entries()) {
    if (!mappedPath) {
      continue
    }
    fixedDistIndexHtml = replaceModuleScriptSrcByIndex(fixedDistIndexHtml, scriptIndex, mappedPath)
  }
  if (fixedDistIndexHtml !== distIndexHtml) {
    await Bun.write(distIndexHtmlPath, fixedDistIndexHtml)
  }
}

const MODULE_SCRIPT_TAG_REGEX = /<script\b[^>]*\btype=(['"])module\1[^>]*>\s*<\/script>/gi
const SCRIPT_SRC_REGEX = /\bsrc=(['"])([^'"]+)\1/i

function getModuleScriptSrcs(html: string): string[] {
  return [...html.matchAll(MODULE_SCRIPT_TAG_REGEX)]
    .map((match) => {
      const srcMatch = SCRIPT_SRC_REGEX.exec(match[0])
      return srcMatch?.[2]
    })
    .filter((src): src is string => typeof src === 'string' && src.length > 0)
}

function replaceModuleScriptSrcByIndex(html: string, index: number, newSrc: string): string {
  let currentIndex = -1
  return html.replace(MODULE_SCRIPT_TAG_REGEX, (tag) => {
    currentIndex += 1
    if (currentIndex !== index) {
      return tag
    }
    return tag.replace(SCRIPT_SRC_REGEX, `src="${newSrc}"`)
  })
}

function isHttpLikePath(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')
}

function toPosixPath(path: string): string {
  return path.replaceAll('\\', '/')
}

function resolveModuleScriptSourcePathFromIndexHtml(indexHtmlPath: string, src: string): string | null {
  if (!src || src.startsWith('data:') || src.startsWith('javascript:') || isHttpLikePath(src)) {
    return null
  }
  const normalizedSrc = src.startsWith('/') ? `.${src}` : src
  return nodePath.resolve(nodePath.dirname(indexHtmlPath), normalizedSrc)
}

function toMetafileOrNull(value: unknown): BunMetafile | null {
  if (!value) {
    return null
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as BunMetafile
    } catch {
      return null
    }
  }
  if (typeof value === 'object') {
    return value as BunMetafile
  }
  return null
}

function getMetafileCandidateInputKeys(absPath: string): string[] {
  const relPath = toPosixPath(nodePath.relative(process.cwd(), absPath))
  const prefixedRelPath = relPath.startsWith('./') ? relPath : `./${relPath}`
  const absPosixPath = toPosixPath(absPath)
  return [relPath, prefixedRelPath, absPosixPath]
}

function findBuiltChunkPublicPathForModuleScript({
  sourceIndexHtmlPath,
  moduleScriptSourcePath,
  metafile,
}: {
  sourceIndexHtmlPath: string
  moduleScriptSourcePath: string
  metafile: BunMetafile
}): string | null {
  const outputs = metafile.outputs
  if (!outputs) {
    return null
  }

  const indexHtmlEntryPointKey = toPosixPath(nodePath.relative(process.cwd(), sourceIndexHtmlPath))
  const scriptInputKeys = getMetafileCandidateInputKeys(moduleScriptSourcePath)

  const candidateOutputPath = Object.entries(outputs).find(([outputPath, outputItem]) => {
    if (!outputPath.endsWith('.js') || outputItem.entryPoint !== indexHtmlEntryPointKey) {
      return false
    }
    const inputKeys = outputItem.inputs ? Object.keys(outputItem.inputs) : []
    return scriptInputKeys.some((key) => inputKeys.includes(key))
  })?.[0]

  if (!candidateOutputPath) {
    return null
  }

  return candidateOutputPath.startsWith('./') ? candidateOutputPath.slice(1) : `/${candidateOutputPath}`
}

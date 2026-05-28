import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { DocsData } from './types.js'

/**
 * Prebuilt docs + embeddings, generated at package build time by `scripts/build-content.ts`
 * and shipped inside the package. Lives next to the compiled output: `<pkg>/content/docs.json`.
 */
const docsDataUrl = new URL('../content/docs.json', import.meta.url)

let cache: DocsData | undefined

export const loadDocsData = (): DocsData => {
  if (!cache) {
    const raw = readFileSync(fileURLToPath(docsDataUrl), 'utf8')
    cache = JSON.parse(raw) as DocsData
  }
  return cache
}

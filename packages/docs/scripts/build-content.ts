/**
 * Build step for @point0/docs: read the framework docs, split them into sections, embed every section locally, and
 * write a single prebuilt `content/docs.json` that ships inside the package. At runtime we only embed the search query
 * — doc vectors are already computed here, so indexing needs no model.
 *
 * Run with: `bun ./scripts/build-content.ts`
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { EMBED_DIM, EMBED_MODEL, embed } from '../src/embedder.js'
import { splitSections } from '../src/sections.js'
import type { Doc, DocCategory, DocSection, DocsData } from '../src/types.js'

const packageDir = path.resolve(import.meta.dir, '..')
const repoDocsDir = path.resolve(packageDir, '../../docs')
const outDir = path.resolve(packageDir, 'content')
const outFile = path.resolve(outDir, 'docs.json')

const readCategories = (): DocCategory[] => {
  const raw = readFileSync(path.resolve(repoDocsDir, 'categories.json'), 'utf8')
  return JSON.parse(raw) as DocCategory[]
}

const readDocs = (categories: DocCategory[]): Doc[] => {
  const docs: Doc[] = []
  for (const category of categories) {
    const categoryDir = path.resolve(repoDocsDir, category.slug)
    const files = readdirSync(categoryDir).filter((file) => file.endsWith('.md'))
    for (const file of files) {
      const raw = readFileSync(path.resolve(categoryDir, file), 'utf8')
      const { data, content } = matter(raw)
      const name = file.replace(/\.md$/, '')
      docs.push({
        // Slug is just the file name; category is cosmetic and not part of the slug.
        slug: name,
        category: category.slug,
        title: typeof data.title === 'string' ? data.title : name,
        description: typeof data.description === 'string' ? data.description : '',
        index: typeof data.index === 'number' ? data.index : 0,
        content: content.trim(),
      })
    }
  }
  return docs
}

const build = async () => {
  const categories = readCategories()
  const docs = readDocs(categories)
  const sections: DocSection[] = []
  for (const doc of docs) {
    // Split at H2–H6 with GitHub-style anchors (matching the docs site's rehype-slug) — see src/sections.ts.
    const docSections = splitSections(doc.content, doc.title)
    for (const { headingId, heading, level, content } of docSections) {
      const embedding = await embed(`${doc.title}\n${heading}\n${content}`)
      sections.push({
        // Anchored, stable id: `slug#headingId` (just `slug` for the preamble). Replaces the old positional `slug#N`.
        id: headingId ? `${doc.slug}#${headingId}` : doc.slug,
        docSlug: doc.slug,
        title: doc.title,
        category: doc.category,
        heading,
        headingId,
        level,
        content,
        embedding,
      })
    }
  }
  const data: DocsData = { model: EMBED_MODEL, dim: EMBED_DIM, categories, docs, sections }
  mkdirSync(outDir, { recursive: true })
  writeFileSync(outFile, JSON.stringify(data), 'utf8')
  console.info(
    `[point0/docs] built ${docs.length} docs, ${sections.length} sections → ${path.relative(packageDir, outFile)}`,
  )
}

await build()

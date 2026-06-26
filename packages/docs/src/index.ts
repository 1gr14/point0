export {
  listDocs,
  searchDocs,
  getDocOrUndefined,
  getDocOutlineOrUndefined,
  getDocSectionOrUndefined,
} from './search.js'
export { loadDocsData } from './content.js'
export { EMBED_MODEL, EMBED_DIM } from './embedder.js'
export type {
  Doc,
  DocCategory,
  DocSection,
  DocsData,
  DocSummary,
  DocSearchHit,
  DocOutline,
  DocOutlineEntry,
  DocSectionContent,
} from './types.js'

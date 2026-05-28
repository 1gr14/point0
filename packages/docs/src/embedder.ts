import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

/** Small, fast sentence-embedding model. 384-dim, ~23MB, runs locally with no API key. */
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBED_DIM = 384

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined

const getExtractor = async (): Promise<FeatureExtractionPipeline> => {
  // The model is downloaded once into the shared Hugging Face cache (~/.cache/huggingface),
  // so it is reused across all projects rather than duplicated per node_modules.
  extractorPromise ??= pipeline('feature-extraction', EMBED_MODEL)
  return await extractorPromise
}

/** Embed a single string into a normalized 384-dim vector. */
export const embed = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data, Number)
}

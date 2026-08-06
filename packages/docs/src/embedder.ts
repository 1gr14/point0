import * as nodeOs from 'node:os'
import * as nodePath from 'node:path'
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

/** Small, fast sentence-embedding model. 384-dim, ~23MB, runs locally with no API key. */
export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'
export const EMBED_DIM = 384

/**
 * Where the model lands. Transformers.js defaults to `./node_modules/@huggingface/transformers/.cache/`, which is wiped
 * by every fresh install — so a CI runner re-downloaded the model on EVERY build, and the workflow's cache of
 * `~/.cache/huggingface` had nothing to save (`Cache not found` on every run, including the green ones). Enough builds
 * in a day and Hugging Face answers 429, which is exactly how the 0.3.6 release run died. One home-level directory
 * instead: survives `node_modules`, shared across projects, and the thing CI caches is now the thing that is written.
 */
env.cacheDir = nodePath.join(nodeOs.homedir(), '.cache', 'huggingface', 'transformers.js')

let extractorPromise: Promise<FeatureExtractionPipeline> | undefined

/** Attempts at loading the model, and the pause before each retry. */
const LOAD_ATTEMPTS = 4
const LOAD_RETRY_DELAY_MS = 5_000

const loadExtractor = async (): Promise<FeatureExtractionPipeline> => {
  // Retried on purpose: fetching the model is the one step of the build that reaches the public internet,
  // and Hugging Face answers a cold runner with 429 often enough to fail a release that has nothing wrong
  // with it. A rate limiter clears in seconds, so a few spaced attempts are the whole fix.
  let lastError: unknown
  for (let attempt = 1; attempt <= LOAD_ATTEMPTS; attempt++) {
    try {
      return await pipeline('feature-extraction', EMBED_MODEL)
    } catch (error) {
      lastError = error
      if (attempt < LOAD_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * LOAD_RETRY_DELAY_MS))
      }
    }
  }
  throw lastError
}

const getExtractor = async (): Promise<FeatureExtractionPipeline> => {
  // The model is downloaded once into the shared Hugging Face cache (~/.cache/huggingface),
  // so it is reused across all projects rather than duplicated per node_modules.
  extractorPromise ??= loadExtractor().catch((error: unknown) => {
    // Don't let one exhausted download poison every later call in the process.
    extractorPromise = undefined
    throw error
  })
  return await extractorPromise
}

/** Embed a single string into a normalized 384-dim vector. */
export const embed = async (text: string): Promise<number[]> => {
  const extractor = await getExtractor()
  const output = await extractor(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data, Number)
}

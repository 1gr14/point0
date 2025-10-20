import type { HydrateResult, HydrateInput } from '../../client/hydrate.js'
import { hydrate } from '../../client/hydrate.js'

// Yeah, it is just wrapper around hydrate, but I am prepearing to do smae for vite, and maybe there should be some addtional props
// I want same style, like import @point0/adapter_name/client-ssr.js
export const clientSsrEntry = async ({ ...hydrateInput }: {} & HydrateInput): Promise<HydrateResult> => {
  return await hydrate(hydrateInput)
}

export default clientSsrEntry

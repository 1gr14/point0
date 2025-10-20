import type { HydrateResult, HydrateInput } from '../../client/hydrate.js'
import { hydrate } from '../../client/hydrate.js'

export const clientSsrEntry = async ({
  hmr = true,
  ...hydrateInput
}: { hmr?: boolean } & HydrateInput): Promise<HydrateResult> => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (import.meta.hot && hmr && process.env.NODE_ENV !== 'production') {
    import.meta.hot.accept()
  }

  return await hydrate(hydrateInput)
}

export default clientSsrEntry

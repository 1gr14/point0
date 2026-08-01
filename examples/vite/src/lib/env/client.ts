import { clientEnvShape } from '@/lib/env/shared'
import { createEnv } from '@/lib/env/utils'
import '@point0/core/client-only'

// Dev only: route client→server requests through the client origin (the dev client proxies them) so SSR fetches skip
// CORS. Under `bun run start` the server serves the client itself and the two URLs already match — rewriting there
// would aim fetches at a dev client port that isn't listening. The env getters read `process.env` lazily, so mutating
// it here is enough: `clientEnv.SERVER_URL` and `sharedEnv.SERVER_URL` both pick up the new value — as long as nothing
// has read them yet, which is why `index.client.tsx` imports this module first. No SSR? Drop this and use the
// `@point0/cors` plugin instead.
if (process.env.NODE_ENV !== 'production') {
  process.env.SERVER_URL = process.env.CLIENT_URL
}

/**
 * Browser-side env. Lazily validated — `index.client.tsx` calls `clientEnv.validate()` before mounting to fail fast; in
 * dev `SERVER_URL` is pointed at `CLIENT_URL` (see above) so SSR client→server requests skip CORS.
 *
 * This file is the handle only; its shape lives in `shared.ts`. That is the one place the pattern bends, and it bends
 * for a reason: the **server** decides what reaches the browser and injects `clientEnvKeys` into every page, so it has
 * to read the key list — and this module is exactly what it must not import. The rewrite above would point the server
 * at its own client's URL, and `@point0/core/client-only` makes the compiler deny the import anyway.
 *
 * @tags env, zod
 * @related clientEnvShape, sharedEnv, serverEnv
 */
export const clientEnv = createEnv('client', clientEnvShape)

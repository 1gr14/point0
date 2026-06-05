import { clientEnvShape } from '@/lib/env/client-shape'
import '@point0/core/client-only'
import { z } from 'zod'

const result = z.object(clientEnvShape).safeParse(process.env)

if (!result.success) {
  throw new Error('Invalid client environment variables', { cause: result.error })
}

/**
 * Browser-side env (shape in `clientEnvShape`). Validated the first time this module is imported.
 *
 * In the devp0nt site this file also rewrites `SERVER_URL` to `CLIENT_URL` so SSR client→server requests go through the
 * dev proxy and skip CORS. This example talks to `SERVER_URL` directly, so no rewrite is needed.
 */
export const clientEnv = { ...result.data }

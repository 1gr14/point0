import { clientEnvShape } from '@/lib/env/client-shape'
import '@point0/core/client-only'
import { z } from 'zod'

const result = z.object(clientEnvShape).safeParse(process.env)

if (!result.success) {
  throw new Error('Invalid client environment variables', { cause: result.error })
}

/**
 * Browser-side env (shape in `clientEnvShape`). Validated the first time this module is imported.
 */
export const clientEnv = { ...result.data }

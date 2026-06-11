import { sharedEnvShape } from '@/lib/env/shared-shape'
import { z } from 'zod'

export { sharedEnvShape }

const result = z.object(sharedEnvShape).safeParse(process.env)

if (!result.success) {
  throw new Error('Invalid shared environment variables', { cause: result.error })
}

export const sharedEnv = { ...result.data }

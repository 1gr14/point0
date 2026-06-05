import { z } from 'zod'

/**
 * Env variables available on BOTH server and client. Each side re-parses with its own shape (`clientEnvShape` and the
 * server shape in `server.ts`); this file is the single source of truth for what is safe to share.
 *
 * Never put secrets here — every shared key is exposed to client.
 */
export const sharedEnvShape = {
  SERVER_URL: z.string().min(1),
}

const result = z.object(sharedEnvShape).safeParse(process.env)

if (!result.success) {
  throw new Error('Invalid shared environment variables', { cause: result.error })
}

export const sharedEnv = { ...result.data }

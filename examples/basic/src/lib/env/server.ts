import { sharedEnvShape } from '@/lib/env/shared-shape'
import '@point0/core/server-only'
import { z } from 'zod'

const isProdNodeEnv = process.env.NODE_ENV === 'production'

const result = z
  .object({
    ...sharedEnvShape,
    // Locally we set SERVER_PORT / CLIENT_PORT; in prod the platform injects PORT instead. The engine binds
    // `SERVER_PORT || PORT`, so either works depending on what's provided.
    SERVER_PORT: isProdNodeEnv ? z.string().optional() : z.string().min(1),
    CLIENT_PORT: isProdNodeEnv ? z.string().optional() : z.string().min(1),
    PORT: z.string().optional(),
    DATABASE_URL: z.string().min(1),
    // Artificial per-query delay (ms) to imitate a slow server. Optional — defaults to 0.
    PRISMA_QUERY_DELAY_MS: z.coerce.number().default(0),
  })
  .safeParse(process.env)

if (!result.success) {
  throw new Error('Invalid server environment variables', { cause: result.error })
}

/**
 * Server-side env (secrets + server-only config). Read server config via `serverEnv` — never `process.env` directly in
 * features; it's schema-validated and typed. To add a var: extend the schema above and add it to `.env`.
 */
export const serverEnv = { ...result.data }

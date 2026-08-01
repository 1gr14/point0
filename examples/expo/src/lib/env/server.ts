import { createEnv } from '@/lib/env/utils'
import { z } from 'zod'

/**
 * Server-side env for the API half of this example. Lazily validated — `index.server.ts` calls `serverEnv.validate()`
 * right after the preload to fail fast; reading a single variable validates just that one.
 *
 * Only the server has a shape here: the Expo app is bundled by Metro, gets its own `EXPO_PUBLIC_*` variables from Expo,
 * and never imports this file. `engine.ts` stays on raw `process.env.SERVER_PORT` — its import graph is loaded before
 * anything is validated.
 *
 * Read server config via `serverEnv` — never `process.env` directly in features; it's schema-validated and typed. To
 * add a variable: extend the shape below and add it to `.env`.
 *
 * @tags env, zod
 * @related createEnv
 */
export const serverEnv = createEnv('server', {
  SERVER_PORT: z.string().min(1),
  DATABASE_URL: z.string().min(1),
})

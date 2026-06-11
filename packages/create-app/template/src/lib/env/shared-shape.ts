import { z } from 'zod'

/**
 * Zod shape for env variables available on BOTH server and client. Each side re-parses with its own shape
 * (`clientEnvShape` and the server shape in `server.ts`); this file is the single source of truth for what is safe to
 * share.
 *
 * Shape only, no validation — it is imported from `engine.ts` (via `client-shape.ts`), and the engine file's import
 * graph must stay side-effect free. The validation lives in `shared.ts`.
 *
 * Never put secrets here — every shared key is exposed to the client.
 */
export const sharedEnvShape = {
  SERVER_URL: z.string().min(1),
  CLIENT_URL: z.string().min(1),
}

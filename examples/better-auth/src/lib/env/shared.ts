import { createEnv } from '@/lib/env/utils'
import { z } from 'zod'

/**
 * The env both sides may see — the shape, the handle, and the browser's allowlist.
 *
 * Shape and handle live together because validation is lazy: `createEnv` only defines getters, so declaring a variable
 * costs nothing until something reads it. `engine.ts` imports `clientEnvKeys` from here and its import graph must stay
 * side-effect free — nothing in this file reads or validates `process.env` at import time.
 *
 * `clientEnvShape` lives here too, and that is deliberate. What reaches the browser is decided by the **server**, which
 * injects `clientEnvKeys` into every page it serves (`engine.ts` → `client.env.vars`), so the list is a shared fact.
 * The matching `clientEnv` handle cannot live here for exactly that reason: it carries browser-only side effects (see
 * `client.ts`).
 *
 * @tags env, zod
 * @related createEnv, clientEnv, serverEnv
 */

/** Variables that mean the same thing on both sides — URLs, public ids, modes. Never a secret. */
export const sharedEnvShape = {
  SERVER_URL: z.string().min(1),
  CLIENT_URL: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
}

/**
 * Env shared by server and client. Lazily validated — reading a variable validates just that one; the app entries call
 * `validate()` on `serverEnv` / `clientEnv` to check the whole set up front.
 */
export const sharedEnv = createEnv('shared', sharedEnvShape)

/**
 * Everything exposed to the browser: the shared variables plus the client-only public ones. Add client-only keys here.
 *
 * Never add secrets — these values reach the browser. They are **not** baked into the bundle: the server injects each
 * key's runtime value into every served page, so they resolve at runtime, not build time.
 */
export const clientEnvShape = {
  ...sharedEnvShape,
  // any client-only env variables go here, e.g.
  // SOMETHING_PUBLIC: z.string().min(1),
}

/** The allowlist of names the engine injects into every served page — see `engine.ts` (`client.env.vars`). */
export const clientEnvKeys = Object.keys(clientEnvShape)

import { sharedEnvShape } from '@/lib/env/shared'

/**
 * Zod shape for variables exposed to the browser bundle. Add client-only keys here.
 *
 * Never add secrets — every key here is bundled into the client JS. `clientEnvKeys` is consumed by the build pipeline
 * (`engine.ts` → `client.env.vars`) so the framework knows which vars to send to the client.
 */
export const clientEnvShape = {
  ...sharedEnvShape,
  // any client-only env variables go here, e.g.
  // SOMETHING_PUBLIC: z.string().min(1),
}

export const clientEnvKeys = Object.keys(clientEnvShape)

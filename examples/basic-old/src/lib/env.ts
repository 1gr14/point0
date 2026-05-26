import { env } from '@point0/core'
import { z } from 'zod'

// we can define types to use later via env.vars.SERVER_URL
declare module '@point0/core' {
  interface EnvDefinition {
    vars: { SERVER_URL: string }
    // in case if we need to use different scopes, runtimes, etc
    // scope: 'desktop' | 'web'
    // runtime: 'browser' | 'ios' | 'android'
    // os: 'mac' | 'windows' | 'linux'
  }
}

export const clientEnv = {} as ReturnType<typeof validateClientEnv>

export const serverEnv = {} as ReturnType<typeof validateServerEnv>

export const validateClientEnv = env.side.define.unsafe.client(() => {
  const result = z
    .object({
      SERVER_URL: z.string().min(1),
    })
    .safeParse(process.env)
  if (!result.success) {
    throw new Error('Invalid client environment variables', { cause: result.error })
  }
  Object.assign(clientEnv, result.data)
  return result.data
})

export const validateServerEnv = env.side.define.unsafe.server(() => {
  const result = z
    .object({
      DATABASE_URL: z.string().min(1),
      SERVER_URL: z.string().min(1),
    })
    .safeParse(process.env)
  if (!result.success) {
    throw new Error('Invalid server environment variables', { cause: result.error })
  }
  Object.assign(serverEnv, result.data)
  return result.data
})

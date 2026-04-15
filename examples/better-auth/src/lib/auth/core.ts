import { env, log } from '@point0/core'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { createAuthClient } from 'better-auth/react'
import { clientEnv, serverEnv } from '../env'
import { prisma } from '../prisma'

export const authServer = env.side.define.unsafe.server(
  betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'sqlite',
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: serverEnv.BETTER_AUTH_SECRET,
    baseURL: serverEnv.BETTER_AUTH_URL,
    logger: {
      log: (level, message, ...args) => {
        log({
          level,
          category: ['better-auth'],
          message: message.replace(/^\[better\-auth\] /, ''),
          ...(args.length > 0 ? { meta: { args } } : {}),
        })
      },
    },
  }),
)

export const authClient = env.side.define.unsafe.client(
  createAuthClient({
    baseURL: clientEnv.BETTER_AUTH_URL,
    fetchOptions: {
      onRequest: (request) => {
        return request
      },
    },
  }),
)

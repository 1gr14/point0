import { env, log } from '@point0/core'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { createAuthClient } from 'better-auth/react'
import { prisma } from '../prisma'

export const authServer = env.side.define.unsafe.server(
  betterAuth({
    database: prismaAdapter(prisma, {
      provider: 'sqlite',
    }),
    emailAndPassword: {
      enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me-please',
    baseURL: process.env.BETTER_AUTH_URL ?? process.env.SOURCE_BASE_URL ?? 'http://localhost:3000',
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
    baseURL: process.env.SOURCE_BASE_URL ?? 'http://localhost:3001',
    fetchOptions: {
      onRequest: (request) => {
        return request
      },
    },
  }),
)

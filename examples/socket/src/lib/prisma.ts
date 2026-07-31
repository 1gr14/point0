import '@point0/core/cold' // server boot singleton — its downward subtree is externalized; editing it restarts the server
import { PrismaClient } from '@/generated/prisma/client'
import { serverEnv } from '@/lib/env/server'
import '@point0/core/server-only'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// to imitate slow server response
const queryDelayMs = serverEnv.PRISMA_QUERY_DELAY_MS

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: serverEnv.DATABASE_URL }),
  log: ['error'],
}).$extends({
  query: {
    $allModels: {
      async $allOperations({ query, args }) {
        if (queryDelayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, queryDelayMs))
        }
        return query(args)
      },
    },
  },
})

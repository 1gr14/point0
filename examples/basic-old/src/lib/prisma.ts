import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

// to imitate slow server response
const queryDelayMs = Number(process.env.PRISMA_QUERY_DELAY_MS ?? 0)

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL as string }),
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

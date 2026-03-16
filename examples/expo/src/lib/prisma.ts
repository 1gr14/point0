import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '@/generated/prisma/client'

const databaseUrl = process.env.DATABASE_URL ?? 'file:./dev.db'

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: databaseUrl }),
  log: ['error'],
})

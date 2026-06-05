import { PrismaClient } from '@/generated/prisma/client'
import { serverEnv } from '@/lib/env/server'
import '@point0/core/server-only'
import { PrismaLibSql } from '@prisma/adapter-libsql'

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: serverEnv.DATABASE_URL }),
  log: ['error'],
})

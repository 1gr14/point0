import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '@/generated/prisma/client'
import { serverEnv } from '@/lib/env/server'

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: serverEnv.DATABASE_URL }),
  log: ['error'],
})

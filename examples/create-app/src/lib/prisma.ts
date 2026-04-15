import { PrismaClient } from '@/generated/prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

export const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: process.env.DATABASE_URL as string }),
  log: ['error'],
})

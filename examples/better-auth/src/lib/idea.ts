import type { IdeaSelect } from '@/generated/prisma/models/Idea'
import * as z from 'zod'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'

export const ideaGeneralShape = {
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  content: z.string().min(1).max(2000),
  image: z.file().optional(),
}

export const ideaCreateSchema = z.object({
  ...ideaGeneralShape,
})

export const ideaUpdateSchema = z.object({
  id: z.number(),
  ...ideaGeneralShape,
})

export const ideaPrismaSelect = {
  id: true,
  title: true,
  description: true,
  content: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: { id: true, name: true },
  },
} satisfies IdeaSelect

export const ideaViewQuery = root.lets
  .query()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: input.id },
      select: ideaPrismaSelect,
    })
    return { idea: idea }
  })
  .query()

import * as z from 'zod'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'

export const ideasQuery = root
  .lets('query', 'ideas')
  .loader(async () => {
    const ideas = await prisma.idea.findMany({
      orderBy: { createdAt: 'desc' },
    })

    return { ideas }
  })
  .query()

export const createIdeaMutation = root
  .lets('mutation', 'createIdea')
  .input(
    z.object({
      title: z.string().min(1).max(120),
      content: z.string().min(1).max(2000),
    }),
  )
  .loader(async ({ input }) => {
    const idea = await prisma.idea.create({
      data: {
        title: input.title,
        content: input.content,
      },
    })

    return { idea }
  })
  .mutation()

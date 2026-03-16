import * as z from 'zod'
import { root } from './lib/root'
import { prisma } from './lib/prisma'

export const ideasQuery = root
  .lets('query', 'ideas')
  .loader(async () => {
    // const { prisma } = await import('./lib/prisma')
    const ideas = await prisma.idea.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return { ideas }
  })
  .query()

export const ideaQuery = root
  .lets('query', 'idea')
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => {
    // const { prisma } = await import('./lib/prisma')
    const idea = await prisma.idea.findUnique({
      where: { id: input.id },
    })
    if (!idea) {
      throw new Error('Idea not found')
    }
    return { idea }
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
    // const { prisma } = await import('./lib/prisma')
    const idea = await prisma.idea.create({
      data: {
        title: input.title,
        content: input.content,
      },
    })
    return { idea }
  })
  .mutation()

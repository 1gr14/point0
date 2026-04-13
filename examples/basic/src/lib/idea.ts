import * as z from 'zod'
import { prisma } from './prisma'
import { root } from './root'

export const ideaGeneralShape = {
  title: z.string().min(1).max(100),
  date: z.date(),
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

export const ideaViewQuery = root.lets
  .query()
  .input(z.object({ id: z.number() }))
  .loader(async ({ input }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: +input.id },
    })
    return { idea }
  })
  .query()

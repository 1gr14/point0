import type { Idea } from './data.js'
import { fakeIdeas } from './data.js'

export const prisma = {
  idea: {
    count: async (): Promise<number> => fakeIdeas.length,

    findMany: async (): Promise<Idea[]> => {
      // Simulate async database call
      await new Promise((resolve) => setTimeout(resolve, 10))
      return [...fakeIdeas].reverse()
    },

    findUniqueOrThrow: async ({ where }: { where: { id: number } }): Promise<Idea> => {
      // Simulate async database call
      await new Promise((resolve) => setTimeout(resolve, 10))
      const idea = fakeIdeas.find((idea) => idea.id === where.id)
      if (!idea) {
        throw new Error(`Idea with id ${where.id} not found`)
      }
      return idea
    },
  },
}

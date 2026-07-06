import { prisma } from '@/lib/prisma'

const ideas = [
  { title: 'Replace this playground with your own pages' },
  { title: 'Add a field to the Idea model' },
  { title: 'Read the Point0 docs' },
]

export const seed = async () => {
  // delete all data
  await prisma.idea.deleteMany()

  // create all data
  await prisma.idea.createMany({ data: ideas })
}

if (import.meta.main) {
  seed()
    .then(() => {
      console.info(`Seeded ${ideas.length} ideas.`)
    })
    .catch((error) => {
      console.error('Seed failed.', error)
      process.exitCode = 1
    })
}

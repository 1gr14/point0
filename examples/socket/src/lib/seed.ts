import { prisma } from '@/lib/prisma'

// A handful of chat messages so the chat topics aren't empty on first load. Everything else in this
// example (presence, notifications, the live board) is ephemeral and needs no seeding.
const fakeMessages = [
  { topic: 'general', nickname: 'ada', text: 'Welcome to #general!' },
  { topic: 'general', nickname: 'linus', text: 'Open a second tab to watch messages arrive live.' },
  { topic: 'random', nickname: 'grace', text: 'This topic is for anything and everything.' },
  { topic: 'tech', nickname: 'dennis', text: 'Point0 sockets run over one WebSocket per client.' },
]

export const seed = async () => {
  await prisma.message.deleteMany()
  await prisma.message.createMany({ data: fakeMessages })
}

if (import.meta.main) {
  seed()
    .then(() => {
      console.info(`Seeded ${fakeMessages.length} chat messages.`)
    })
    .catch((error) => {
      console.error('Seed failed.', error)
      process.exitCode = 1
    })
}

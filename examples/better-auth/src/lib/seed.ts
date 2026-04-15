import type { IdeaCreateInput } from '@/generated/prisma/models'
import { faker } from '@faker-js/faker'
import { authServer } from './auth/core'
import { prisma } from './prisma'

const fakeIdeas = [
  {
    title: 'AI-Powered Code Review Assistant',
    description: 'An intelligent tool that automatically reviews code and suggests improvements',
    content:
      'This AI assistant would analyze code patterns, detect potential bugs, suggest optimizations, and ensure adherence to coding standards. It would integrate with popular IDEs and version control systems to provide real-time feedback during development.',
  },
  {
    title: 'Decentralized Social Media Platform',
    description: 'A blockchain-based social network that gives users full control over their data',
    content:
      'Built on a decentralized architecture, this platform would allow users to own their content, control their privacy settings, and monetize their posts directly. It would use smart contracts for content moderation and community governance.',
  },
  {
    title: 'Smart Home Energy Optimizer',
    description: 'IoT system that automatically optimizes energy consumption based on usage patterns',
    content:
      'This system would monitor energy usage across all devices in a home, learn user patterns, and automatically adjust settings to minimize costs while maintaining comfort. It would integrate with renewable energy sources and smart grid systems.',
  },
  {
    title: 'Virtual Reality Learning Platform',
    description: 'Immersive educational experiences for complex subjects like chemistry and physics',
    content:
      'Students would be able to manipulate molecules in 3D space, conduct virtual experiments, and explore abstract concepts through interactive simulations. The platform would adapt to individual learning styles and provide real-time feedback.',
  },
  {
    title: 'Automated Personal Finance Manager',
    description: 'AI-driven system that manages investments and optimizes financial decisions',
    content:
      'This system would analyze spending patterns, market trends, and personal goals to automatically rebalance portfolios, suggest investment opportunities, and help users achieve their financial objectives with minimal manual intervention.',
  },
  {
    title: 'Mental Health Companion App',
    description: 'AI-powered app that provides personalized mental health support and therapy',
    content:
      'The app would use natural language processing to understand user emotions, provide coping strategies, connect users with appropriate resources, and track mental health progress over time. It would maintain strict privacy while offering 24/7 support.',
  },
  {
    title: 'Autonomous Delivery Drone Network',
    description: 'Fleet of drones that can deliver packages efficiently in urban and rural areas',
    content:
      'This network would use advanced navigation systems, weather prediction, and traffic management to safely deliver packages. It would integrate with existing logistics systems and provide real-time tracking for customers.',
  },
  {
    title: 'Personalized Medicine Platform',
    description: 'System that analyzes genetic data to recommend personalized treatments',
    content:
      "By analyzing a patient's genetic profile, lifestyle factors, and medical history, this platform would suggest the most effective treatments and medications. It would help doctors make more informed decisions and reduce trial-and-error in treatment.",
  },
] satisfies Partial<IdeaCreateInput>[]

const getFakeNews = (count: number) => {
  return Array.from({ length: count }, () => ({
    title: faker.company.catchPhrase(),
    content: faker.lorem.paragraph(),
  }))
}

export const seed = async () => {
  await Promise.all([
    prisma.ideaNewsPost.deleteMany(),
    prisma.idea.deleteMany(),
    prisma.user.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.verification.deleteMany(),
  ])

  const { user } = await authServer.api.signUpEmail({
    body: {
      name: 'Mister X',
      email: 'x@example.com',
      password: '12345678',
    },
  })

  await Promise.all(
    fakeIdeas.map(async (idea) => {
      await prisma.idea.create({
        data: {
          title: idea.title,
          description: idea.description,
          content: idea.content,
          newsPosts: {
            create: getFakeNews(faker.number.int({ min: 2, max: 5 })),
          },
          user: {
            connect: {
              id: user.id,
            },
          },
        },
      })
    }),
  )
}

if (import.meta.main) {
  seed()
    .then(() => {
      console.info(`Seeded ${fakeIdeas.length} ideas with fake news posts.`)
    })
    .catch((error) => {
      console.error('Seed failed.', error)
      process.exitCode = 1
    })
}

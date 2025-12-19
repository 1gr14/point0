// TODO: create guard for server-only
// import 'server-only'

// const wait = async (ms = 300) => await new Promise((resolve) => setTimeout(resolve, ms))
const wait = async (ms = 100) => await new Promise((resolve) => setTimeout(resolve, ms))

const headers = new Headers()
headers.

export const prisma = {
  idea: {
    count: async (): Promise<number> => {
      await wait()
      return fakeIdeas.length
    },

    create: async ({ data }: { data: Omit<Idea, 'id' | 'news'> }): Promise<Idea> => {
      await wait()
      const id = Math.floor(Math.random() * 1000000)
      const idea = { ...data, id, news: getFakeNews(id) }
      fakeIdeas.push(idea)
      return idea
    },

    update: async ({ where, data }: { where: { id: number }; data: Omit<Idea, 'id' | 'news'> }): Promise<Idea> => {
      const ideaIndex = fakeIdeas.findIndex((idea) => idea.id === where.id)
      if (ideaIndex === -1) {
        throw new Error(`Idea with id ${where.id} not found`)
      }
      const idea = fakeIdeas[ideaIndex]
      const newIdea = { ...idea, ...data }
      fakeIdeas[ideaIndex] = newIdea
      return newIdea
    },

    findMany: async (options: { take?: number; skip?: number } = {}): Promise<Idea[]> => {
      // Simulate async database call
      await wait()
      return [...fakeIdeas].slice(options.skip ?? 0, (options.skip ?? 0) + (options.take ?? fakeIdeas.length))
    },

    findUniqueOrThrow: async ({ where }: { where: { id: number } }): Promise<Idea> => {
      // Simulate async database call
      await wait()
      const idea = fakeIdeas.find((idea) => idea.id === where.id)
      if (!idea) {
        throw new Error(`Idea with id ${where.id} not found`)
      }
      return idea
    },
  },
}

export type Idea = {
  id: number
  title: string
  description: string
  content: string
  news: Array<{
    id: number
    title: string
    content: string
  }>
}

const getFakeNews = (ideaId: number) => {
  return Array.from({ length: 10 }, (_, i) => ({
    id: ideaId * 100 + i,
    title: `News ${i + 1}`,
    content: `Content ${i + 1}`,
  }))
}

export const fakeIdeas: Idea[] = [
  {
    id: 1,
    title: 'AI-Powered Code Review Assistant',
    description: 'An intelligent tool that automatically reviews code and suggests improvements',
    content:
      'This AI assistant would analyze code patterns, detect potential bugs, suggest optimizations, and ensure adherence to coding standards. It would integrate with popular IDEs and version control systems to provide real-time feedback during development.',
    news: getFakeNews(1),
  },
  {
    id: 2,
    title: 'Decentralized Social Media Platform',
    description: 'A blockchain-based social network that gives users full control over their data',
    content:
      'Built on a decentralized architecture, this platform would allow users to own their content, control their privacy settings, and monetize their posts directly. It would use smart contracts for content moderation and community governance.',
    news: getFakeNews(2),
  },
  {
    id: 3,
    title: 'Smart Home Energy Optimizer',
    description: 'IoT system that automatically optimizes energy consumption based on usage patterns',
    content:
      'This system would monitor energy usage across all devices in a home, learn user patterns, and automatically adjust settings to minimize costs while maintaining comfort. It would integrate with renewable energy sources and smart grid systems.',
    news: getFakeNews(3),
  },
  {
    id: 4,
    title: 'Virtual Reality Learning Platform',
    description: 'Immersive educational experiences for complex subjects like chemistry and physics',
    content:
      'Students would be able to manipulate molecules in 3D space, conduct virtual experiments, and explore abstract concepts through interactive simulations. The platform would adapt to individual learning styles and provide real-time feedback.',
    news: getFakeNews(4),
  },
  {
    id: 5,
    title: 'Automated Personal Finance Manager',
    description: 'AI-driven system that manages investments and optimizes financial decisions',
    content:
      'This system would analyze spending patterns, market trends, and personal goals to automatically rebalance portfolios, suggest investment opportunities, and help users achieve their financial objectives with minimal manual intervention.',
    news: getFakeNews(5),
  },
  // {
  //   id: 6,
  //   title: 'Sustainable Food Production System',
  //   description: 'Vertical farming solution that maximizes yield while minimizing environmental impact',
  //   content:
  //     'Using advanced hydroponics, LED lighting, and climate control, this system would produce fresh vegetables year-round in urban environments. It would use AI to optimize growing conditions and reduce water and energy consumption.',
  //   news: getFakeNews(6),
  // },
  {
    id: 7,
    title: 'Mental Health Companion App',
    description: 'AI-powered app that provides personalized mental health support and therapy',
    content:
      'The app would use natural language processing to understand user emotions, provide coping strategies, connect users with appropriate resources, and track mental health progress over time. It would maintain strict privacy while offering 24/7 support.',
    news: getFakeNews(7),
  },
  {
    id: 8,
    title: 'Autonomous Delivery Drone Network',
    description: 'Fleet of drones that can deliver packages efficiently in urban and rural areas',
    content:
      'This network would use advanced navigation systems, weather prediction, and traffic management to safely deliver packages. It would integrate with existing logistics systems and provide real-time tracking for customers.',
    news: getFakeNews(8),
  },
  {
    id: 9,
    title: 'Personalized Medicine Platform',
    description: 'System that analyzes genetic data to recommend personalized treatments',
    content:
      "By analyzing a patient's genetic profile, lifestyle factors, and medical history, this platform would suggest the most effective treatments and medications. It would help doctors make more informed decisions and reduce trial-and-error in treatment.",
    news: getFakeNews(9),
  },
  {
    id: 10,
    title: 'Carbon Footprint Tracker',
    description: 'Comprehensive app that tracks and helps reduce individual carbon emissions',
    content: Array.from({ length: 10000 }, (_, i) => `Content ${i + 1}`).join('\n'),
    news: getFakeNews(10),
  },
]

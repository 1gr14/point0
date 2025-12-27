import { client } from './client'

export const clientCtx1 = client.lets('provider', 'testClientCtx1').provider(({ data }) => {
  return {
    test: 123,
    shmest: '234',
    sr: true,
  }
})

export const clientCtx2 = client
  .lets('provider', 'testClientCtx2')
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ideasCount: ideas.length, env: ctx.env.NODE_ENV }
  })
  .provider(({ data }) => {
    return {
      ...data,
      ideasCountX3: data.ideasCount * 3,
    }
  })

export const clientCtx3 = client
  .lets('provider', 'testClientCtx3')
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ideasCount: ideas.length, env: ctx.env.NODE_ENV }
  })
  .provider()

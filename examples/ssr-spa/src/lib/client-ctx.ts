import { client } from './client'

export const clientCtx1 = client.lets('clientCtx', 'testClientCtx1').clientCtx(({ data }) => {
  return {
    test: 123,
  }
})

export const clientCtx2 = client
  .lets('clientCtx', 'testClientCtx2')
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ...data, ideas, ideasCount: ideas.length, env: ctx.env.NODE_ENV }
  })
  .clientCtx(({ data }) => {
    return {
      ...data,
      ideasCountX3: data.ideasCount * 3,
    }
  })

export const clientCtx3 = client
  .lets('clientCtx', 'testClientCtx3')
  .loader(async ({ ctx, data }) => {
    const ideas = await ctx.prisma.idea.findMany()
    return { ...data, ideas, ideasCount: ideas.length, env: ctx.env.NODE_ENV }
  })
  .clientCtx()

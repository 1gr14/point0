import { Routes } from '@devp0nt/route0'

export const routes = Routes.create({
  home: '/',
  empty: '/empty',
  ideas: '/ideas',
  newIdea: '/ideas/new',
  idea: '/ideas/:id',
  ideaNews: '/ideas/:id/news',
})

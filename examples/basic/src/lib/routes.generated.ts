import { Routes } from '@devp0nt/route0'

export const routes = Routes.create({
  home: '/',
  ideas: '/ideas',
  newIdea: '/ideas/new',
  idea: '/ideas/:id/',
  ideaNews: '/ideas/:id/news',
})

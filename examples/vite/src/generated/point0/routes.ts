import { Routes } from '@1gr14/route0'

export const routes = Routes.create({
  home: '/',
  about: '/about',
  ideaList: '/ideas',
  ideaCreate: '/ideas/new',
  ideaView: '/ideas/:id',
  ideaUpdate: '/ideas/:id/edit',
  ideaNews: '/ideas/:id/news',
})

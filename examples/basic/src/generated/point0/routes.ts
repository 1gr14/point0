import { Route0, Routes } from '@devp0nt/route0'

export const routes = Routes.create({
  'home': '/',
  'about': '/about',
  'ideaList': Route0.create('/ideas').search<typeof import('../../pages/idea-list.js')['ideaListPage']['Infer']['SearchRaw']>(),
  'ideaCreate': '/ideas/new',
  'ideaView': '/ideas/:id',
  'ideaUpdate': '/ideas/:id/edit',
  'ideaNews': Route0.create('/ideas/:id/news').search<typeof import('../../pages/idea-news.js')['ideaNewsPage']['Infer']['SearchRaw']>(),
})

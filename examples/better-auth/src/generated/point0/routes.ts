import { Routes } from '@devp0nt/route0'

export const routes = Routes.create({
  'home': '/',
  'about': '/about',
  'ideaList': '/ideas',
  'profile': '/profile',
  'signIn': '/sign-in',
  'signUp': '/sign-up',
  'ideaCreate': '/ideas/new',
  'ideaView': '/ideas/:id',
  'ideaUpdate': '/ideas/:id/edit',
  'ideaNews': '/ideas/:id/news',
})

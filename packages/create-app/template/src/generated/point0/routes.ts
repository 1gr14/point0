import { Routes } from '@1gr14/route0'

export const routes = Routes.create(
  {
    home: '/',
    about: '/about',
  },
  { origin: process.env.CLIENT_URL },
)

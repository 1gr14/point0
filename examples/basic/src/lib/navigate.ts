import { createNavigation } from '@point0/wouter'
import { navigate as browserNavigate, useBrowserLocation as hook } from 'wouter/use-browser-location'
import { routes } from './routes'

export const { navigate, Link, NavLink, Redirect, redirect, Router, RouterRoutes } = createNavigation({
  routes,
  navigate: browserNavigate,
  hook,
})

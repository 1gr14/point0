import { createNavigation } from '@point0/wouter'
import { navigate as browserNavigate, useBrowserLocation as hook } from 'wouter/use-browser-location'
import { routes } from './routes.js'

export const { navigate, Link, NavLink, Redirect, Router, RouterRoutes } = createNavigation({
  routes,
  navigate: browserNavigate,
  hook,
  Page404: () => <div>Page Not Found</div>,
})

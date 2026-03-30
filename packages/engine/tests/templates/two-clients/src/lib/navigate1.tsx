import { createNavigation } from '@point0/react-dom/router'
import { navigate as browserNavigate, useBrowserLocation as hook } from 'wouter/use-browser-location'
import { routes } from './routes1.js'

export const { navigate, Link, NavLink, Redirect, Router, RouterRoutes, redirect } = createNavigation({
  routes,
  navigate: browserNavigate,
  hook,
  Page404: () => <div>Page Not Found 1</div>,
})

import { createNavigation } from '@point0/wouter'
import { navigate as browserNavigate, useBrowserLocation as hook } from 'wouter/use-browser-location'
import { routes } from './routes'

// export const Link = createLink({ routes, hook })
// export const NavLink = createNavLink({ routes, hook })
// export const navigate = createNavigate({ routes, navigate: browserNavigate })
// // export const redirect = createRedirectHelper(routes, nativeNavigate)
// export const Redirect = createRedirectComponent({ routes, hook })

// shortcut
export const { navigate, Link, NavLink, Redirect, Router, RouterRoutes } = createNavigation({
  routes,
  navigate: browserNavigate,
  hook,
})

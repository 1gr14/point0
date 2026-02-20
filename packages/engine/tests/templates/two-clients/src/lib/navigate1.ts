import { createLink, createNavigate, createNavLink, createUseNavigate } from '@point0/wouter'
import { navigate as nativeNavigate } from 'wouter/use-browser-location'
import { routes } from './routes1.js'

export const Link = createLink(routes)
export const NavLink = createNavLink(routes)
export const useNavigate = createUseNavigate(routes)
export const navigate = createNavigate(routes, nativeNavigate)

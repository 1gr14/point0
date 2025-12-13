import { createLink0, createNavigate0, createUseNavigate0 } from '@point0/wouter'
import { navigate as nativeNavigate } from 'wouter/use-browser-location'
import { routes } from './routes'

export const Link = createLink0(routes)
export const useNavigate = createUseNavigate0(routes)
export const navigate = createNavigate0(routes, nativeNavigate)

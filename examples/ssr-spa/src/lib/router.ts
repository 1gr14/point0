import { createRouterHelpers } from 'point0/adapters/wouter'
import { routes } from './routes'

export const { useLocation, Link } = createRouterHelpers({ routes })

import { _point0_env } from './env.js'
import { Effects } from './effects.js'

export const setStatus = (status: number): void => {
  if (!_point0_env.side.is.server) {
    return
  }
  Effects.getWeak()?.set.status(status)
}

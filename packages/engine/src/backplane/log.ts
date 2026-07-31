import { log } from '@point0/core'

/**
 * The adapters' error sink. Background failures — a reconnect resubscribe, a sweep, a detached dispose — have no caller
 * to reject into, so they ride the ambient Point0 server logger (`log` from `@point0/core`): the engine keeps it
 * pointed at the effective logger — the `logger` engine option, overridden by the root point's when one is set — so an
 * adapter constructed in the config factory logs exactly where the rest of the server does, with no logger to thread
 * through.
 */
export const backplaneLogError =
  (adapter: string) =>
  (what: string, error: unknown): void => {
    log({
      level: 'error',
      category: ['point0', 'socket'],
      message: `Socket backplane (${adapter}) ${what} failed`,
      error,
    })
  }

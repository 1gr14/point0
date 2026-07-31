import { readNickname } from '@/lib/auth'
import { root } from '@/lib/root'

/**
 * The one thing every page shares: the channel — a single WebSocket per client, held open for the whole app by the
 * `<appChannel.Connection>` in `app.client.tsx` and reused by every space on every page.
 *
 * Everything else lives in the page that uses it, because that is how point0 is meant to be written: the space, its
 * handlers and its server code sit next to the component that renders them, and the compiler strips each side out of
 * the other bundle. Read a page top-to-bottom and you have the whole feature:
 *
 * - `pages/chat.tsx` — rooms with persisted messages (space + server handler + Prisma + a plain HTTP history query)
 * - `pages/presence.tsx` — who is in the room right now (join/leave events + a socket query)
 * - `pages/notifications.tsx` — a personal room per user via `.enroller`, pushed from an HTTP mutation
 * - `pages/board.tsx` — one shared, DB-less room broadcast to space-wide
 */

// EVERYONE connects — signed in or not. The connector reads the nickname cookie and returns this connection's
// identity: a nickname, or `null` for a guest. Watching is free everywhere; every ACTION the app gates is gated
// SERVER-SIDE, where the identity is trusted — the send handlers refuse `nickname: null`, presence skips guests,
// the enroller gives them no personal room. Signing in/out calls `reconnectAll()`, the connector re-runs with the
// new cookie, and the identity flips.
export const appChannel = root.lets
  .channel()
  .loading(() => (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Connecting to the socket…
    </div>
  ))
  .error(({ error }) => (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      The socket is unavailable: {error.message}
    </div>
  ))
  .connector(async ({ request }) => {
    return { nickname: readNickname(request.cookies) } // this connection's identity: a nickname, or null for a guest
  })
  // resumable: a reconnect (a network blip, a redeploy) RESTORES the connection — identity and rooms — without
  // re-running this connector or any joiner. `onConnect`/`onEnter` then fire with `resumed: true`, and their
  // `gapless` flag says whether anything could have been missed — the chat page's catch-up hangs on exactly that
  .channel({ resumable: true })

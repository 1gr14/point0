import * as z from 'zod'
import { root } from '@/lib/root'
import { Point0 } from '@point0/core'
import { reconnectAll } from '@point0/core/socket'

/**
 * Fake, password-less auth for the demo. The "session" is a single httpOnly cookie holding a nickname, set by
 * {@link signInMutation} and cleared by {@link signOutMutation}. The socket channel's `.connector` reads this same cookie
 * to decide who the connection is (see `channel.tsx`) — a missing cookie is a GUEST (`nickname: null`), not a refusal:
 * guests watch everything, and only the actions are gated (always server-side).
 *
 * Because the cookie is httpOnly, client JS can't read it — {@link meQuery} is how the browser learns who it is signed
 * in as: `me` is the signed-in user, or `null` for a guest. Pages that adapt to the viewer take {@link mePlugin}:
 * `.use(mePlugin)` puts `{ me }` into the page props.
 *
 * Everything a sign-in/out must cause — repaint the header, reconnect the socket channel so its `.connector` re-judges
 * the identity — lives HERE, on the mutations' own `onSuccess`: call sites just call `mutateAsync`.
 */
export const NICKNAME_COOKIE = 'nickname'

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'Nickname must be at least 2 characters')
  .max(20, 'Nickname must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Only letters, digits, dash and underscore')

/** Reads the nickname cookie the browser sent. Returns `null` when nobody is signed in. */
export const readNickname = (cookies: Record<string, string | undefined>): string | null => {
  const parsed = nicknameSchema.safeParse(cookies[NICKNAME_COOKIE])
  return parsed.success ? parsed.data : null
}

export const meQuery = root.lets
  .query()
  .loader(async ({ request }) => {
    const nickname = readNickname(request.cookies)
    return { me: nickname === null ? null : { nickname } }
  })
  .query()

export type Me = NonNullable<(typeof meQuery.Infer.QueriedData)['me']>

export const mePlugin = Point0.lets
  .plugin()
  .with(meQuery, undefined, undefined, ({ data }) => ({ me: data.me }))
  .plugin()

export const signInMutation = root.lets
  .mutation()
  .input(z.object({ nickname: nicknameSchema }))
  .loader(async ({ input: { nickname }, set }) => {
    set.cookies(NICKNAME_COOKIE, nickname, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // a week
    })
    return { me: { nickname } }
  })
  .mutation({
    onSuccess: (data) => {
      void meQuery.setQueryData(undefined, data)
      reconnectAll() // the channel's connector re-runs with the fresh cookie — the identity flips to the nickname
    },
  })

export const signOutMutation = root.lets
  .mutation()
  .loader(async ({ set }) => {
    set.cookies(NICKNAME_COOKIE, undefined) // delete
    return { ok: true }
  })
  .mutation({
    onSuccess: () => {
      void meQuery.setQueryData(undefined, { me: null })
      reconnectAll() // same connection machinery — the connector re-judges to a guest identity
    },
  })

import { useState } from 'react'
import { useIsNavigating } from '@point0/core/navigation'
import { meQuery, signInMutation, signOutMutation } from '@/lib/auth'
import { NavLink } from '@/lib/navigation'
import { root } from '@/lib/root'

const navLinkClass = 'rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100'
const navLinkExactClass = 'pointer-events-none bg-slate-900! text-white!'

// Fake sign-in: a nickname goes into an httpOnly cookie (no password). Everything a sign-in/out causes — the header
// repaint, the socket reconnect — lives on the mutations' own `onSuccess` (lib/auth.tsx); here we just call them.
const AuthControls = () => {
  const meData = meQuery.useQuery()
  const signIn = signInMutation.useMutation()
  const signOut = signOutMutation.useMutation()
  const [nickname, setNickname] = useState('')

  const me = meData.data?.me ?? null

  if (me) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">
          Signed in as <span className="font-semibold text-slate-900">{me.nickname}</span>
        </span>
        <button
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:bg-slate-400"
          disabled={signOut.isPending}
          onClick={() => {
            void signOut.mutateAsync(undefined).catch((error) => alert(error.message))
          }}
        >
          Log out
        </button>
      </div>
    )
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        void signIn
          .mutateAsync({ nickname })
          .then(() => setNickname('')) // view state stays with the view — everything else is the mutation's own
          .catch((error) => alert(error.message))
      }}
    >
      <input
        className="w-40 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring focus:ring-blue-200"
        placeholder="nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <button
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-blue-300"
        type="submit"
        disabled={signIn.isPending}
      >
        Sign in
      </button>
    </form>
  )
}

export const generalLayout = root.lets('layout', 'generalLayout').layout(({ children }) => {
  const isNavigating = useIsNavigating()
  return (
    <div
      className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-blue-50 text-slate-800 transition-opacity duration-300 ease-in-out"
      style={{ opacity: isNavigating ? 0.6 : 1 }}
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-2xl border border-white/70 bg-white/80 px-6 py-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              <NavLink className="hover:text-blue-700" exactClassName="pointer-events-none" route="home">
                Point0 Sockets
              </NavLink>
            </h1>
            <AuthControls />
          </div>
          <nav className="mt-4">
            <ul className="flex flex-wrap items-center gap-2">
              <li>
                <NavLink exactClassName={navLinkExactClass} className={navLinkClass} route="home">
                  Home
                </NavLink>
              </li>
              <li>
                <NavLink exactClassName={navLinkExactClass} className={navLinkClass} route="chat">
                  Chat
                </NavLink>
              </li>
              <li>
                <NavLink exactClassName={navLinkExactClass} className={navLinkClass} route="presence">
                  Presence
                </NavLink>
              </li>
              <li>
                <NavLink exactClassName={navLinkExactClass} className={navLinkClass} route="notifications">
                  Notifications
                </NavLink>
              </li>
              <li>
                <NavLink exactClassName={navLinkExactClass} className={navLinkClass} route="board">
                  Live board
                </NavLink>
              </li>
              <li>
                <NavLink exactClassName={navLinkExactClass} className={navLinkClass} route="about">
                  About
                </NavLink>
              </li>
            </ul>
          </nav>
        </header>
        <main className="rounded-2xl border border-white/70 bg-white/80 p-6 shadow-sm backdrop-blur">{children}</main>
      </div>
    </div>
  )
})

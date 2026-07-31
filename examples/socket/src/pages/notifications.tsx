import { useState } from 'react'
import * as z from 'zod'
import { generalLayout } from '@/layouts/general.js'
import { mePlugin, readNickname } from '@/lib/auth'
import { appChannel } from '@/lib/channel'
import { colorForNickname } from '@/lib/colors'
import { AppError } from '@/lib/error'
import { root } from '@/lib/root'

/**
 * Notifications: a personal room per user, filled by the server itself. The space, the push handler and the HTTP
 * mutation that pushes are all declared here, next to the inbox that renders them.
 */

export const notificationSchema = z.object({
  from: z.string(),
  text: z.string(),
  at: z.date(),
})
export type Notification = z.infer<typeof notificationSchema>

// no `.joiner` at all: the browser cannot join this space, whatever room it asks for — a client join is refused
// outright. The server puts every SIGNED-IN connection into its own room, and only there; a guest has no name, so
// the enroller gives it nothing (returning no room enrolls into no room — there is no inbox to address).
export const userSpace = appChannel.lets
  .space<{ nickname: string }>()
  // every signed-in connection lands in its own room, named by its nickname — no client code, no join
  .enroller(({ identity: { nickname } }) => (nickname === null ? undefined : { nickname }))
  .space()

export const notificationHandler = userSpace.lets.clientHandler().serverSend(notificationSchema).clientHandler()

// a plain HTTP mutation: send a notification to another user's personal room
export const sendNotificationMutation = root.lets
  .mutation()
  .input(z.object({ toNickname: z.string().min(1), text: z.string().min(1).max(200) }))
  .loader(async ({ input: { toNickname, text }, request }) => {
    const from = readNickname(request.cookies)
    if (!from) {
      throw new AppError('Sign in to send notifications', { code: 'UNAUTHORIZED', status: 401 })
    }
    const notification: Notification = { from, text, at: new Date() }
    // one exact push to the recipient's personal topic — no scan
    void notificationHandler.sendToClient(notification, { room: { nickname: toNickname } })
    return { ok: true }
  })
  .mutation()

const NotificationsInbox = ({ nickname }: { nickname: string }) => {
  // the inbox lives in component state only — a reload starts empty, and a push sent while this user was offline is
  // gone (delivery is at-most-once). A real inbox persists notifications and reads them through a query; the push
  // then only shortens the latency — see «Delivery» in the channel docs
  const [items, setItems] = useState<Notification[]>([])
  const send = sendNotificationMutation.useMutation()
  const [toNickname, setToNickname] = useState('')
  const [text, setText] = useState('')

  // no membership to hold — the server enrolled this connection into its own room at connect time.
  // The bare hook resolves that single live enrolled membership.
  notificationHandler.useOnMessageFromServer(({ message }) => {
    setItems((prev) => [message, ...prev].slice(0, 20))
  })

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send
            .mutateAsync({ toNickname: toNickname.trim(), text: text.trim() })
            .then(() => setText('')) // view state stays with the view
            .catch((error) => alert(error.message))
        }}
      >
        <h2 className="text-lg font-semibold text-slate-900">Send a notification</h2>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-blue-400 focus:ring focus:ring-blue-200"
          placeholder="to nickname (try your own)"
          value={toNickname}
          onChange={(e) => setToNickname(e.target.value)}
        />
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-blue-400 focus:ring focus:ring-blue-200"
          placeholder="message"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-blue-300"
          type="submit"
          disabled={send.isPending || !toNickname.trim() || !text.trim()}
        >
          {send.isPending ? 'Sending…' : 'Send'}
        </button>
        <p className="text-xs text-slate-400">
          Sends to that nickname's personal room (yours is <span className="font-medium">{nickname}</span> — try it).
          Sign in as the same nickname in another tab to receive it there too.
        </p>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Inbox</h2>
        {items.length === 0 && <p className="text-sm text-slate-400">Nothing yet.</p>}
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-sm">
                <span className="font-semibold" style={{ color: colorForNickname(item.from) }}>
                  {item.from}
                </span>
                <span className="text-slate-400"> · {item.at.toLocaleTimeString()}</span>
              </div>
              <div className="text-slate-800">{item.text}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export const notificationsPage = generalLayout
  .lets('page', 'notifications', '/notifications')
  .head('Notifications')
  .use(mePlugin)
  .page(({ props: { me } }) => {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Notifications</h1>
          <p className="text-slate-600">
            Every signed-in connection is enrolled into a personal room named by its nickname. A server mutation pushes
            straight to that room — one exact address, no scan.
          </p>
        </div>
        {me === null ? (
          // a guest has no personal room — nothing to receive into and nobody to send as. This page is the one
          // recipe that only makes sense with a name, so the interface itself asks for one.
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Sign in from the header to get your personal room — then notifications sent to your nickname land here live.
          </p>
        ) : (
          <NotificationsInbox nickname={me.nickname} />
        )}
      </div>
    )
  })

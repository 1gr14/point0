import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigation'

const cardClass =
  'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow'
const titleClass = 'text-lg font-semibold text-slate-900'
const bodyClass = 'mt-1 text-sm text-slate-600'

export default generalLayout
  .lets('page', 'home', '/')
  .head({ title: 'Point0 Sockets', titleTemplate: null })
  .page(() => {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Point0 Sockets</h1>
          <p className="text-slate-600">
            Four focused recipes on one WebSocket. Everything is live the moment you open it — guests watch every page;
            sign in with any nickname in the header to write, draw and get a personal inbox, and open a second browser
            tab (or window) with a different nickname to watch everything update live.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link route="chat" className={cardClass}>
            <h2 className={titleClass}>Chat</h2>
            <p className={bodyClass}>
              Rooms via a space and a joiner, messages persisted with Prisma, sent with a server handler and pushed to
              the room. History is an ordinary query; a reconnect refetches it.
            </p>
          </Link>
          <Link route="presence" className={cardClass}>
            <h2 className={titleClass}>Presence</h2>
            <p className={bodyClass}>
              Who is online in a room, from membership enumerations plus a push on every join and leave.
            </p>
          </Link>
          <Link route="notifications" className={cardClass}>
            <h2 className={titleClass}>Notifications</h2>
            <p className={bodyClass}>
              A personal room per user via an enroller — send a notification to any nickname and it lands as a toast.
            </p>
          </Link>
          <Link route="board" className={cardClass}>
            <h2 className={titleClass}>Live board</h2>
            <p className={bodyClass}>
              A shared, database-less canvas: every click broadcasts space-wide, so everyone sees the dots instantly.
            </p>
          </Link>
        </div>
      </div>
    )
  })

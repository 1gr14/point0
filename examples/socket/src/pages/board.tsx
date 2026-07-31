import { useState } from 'react'
import * as z from 'zod'
import { generalLayout } from '@/layouts/general.js'
import { appChannel } from '@/lib/channel'
import { colorForNickname } from '@/lib/colors'
import type { Me } from '@/lib/auth'
import { mePlugin } from '@/lib/auth'
import { AppError } from '@/lib/error'

/**
 * The live board: one shared, DB-less room. Space, handlers and component all in this file — the click goes to the
 * server, the server stamps it and fans it out space-wide.
 */

export const boardDotSchema = z.object({
  x: z.number(),
  y: z.number(),
  color: z.string(),
  nickname: z.string(),
})
export type BoardDot = z.infer<typeof boardDotSchema>

// no opener generic: the room is the empty object, so this space is ONE global room. The `joiner` is still what makes
// it joinable — without it clients could not enter at all
export const boardSpace = appChannel.lets
  .space()
  // no input, one shared room — everyone who joins lands on the same board
  .joiner(() => ({}))
  .space()

// client → server: I clicked at (x, y). The server stamps it and fans it out to the whole space. Guests watch the
// board live (the joiner admits everyone) but cannot draw — the gate is HERE, server-side, where the identity is
// trusted; the non-clickable cursor in the component is only the courtesy half
export const boardClickHandler = boardSpace.lets
  .serverHandler()
  .clientSend(z.object({ x: z.number(), y: z.number() }))
  .serverReply<undefined>(async ({ input: { x, y }, identity: { nickname }, reply }) => {
    if (nickname === null) {
      throw new AppError('Sign in to draw', { code: 'UNAUTHORIZED', status: 401 })
    }
    // can send early reply
    reply(undefined)
    const dot: BoardDot = { x, y, color: colorForNickname(nickname), nickname }
    void boardDotHandler.sendToClient(dot) // bare = space-wide, reaches every member
  })
  .serverHandler()

// server → client: a dot appeared on the shared board
export const boardDotHandler = boardSpace.lets.clientHandler().serverSend(boardDotSchema).clientHandler()

const BoardView = ({ me }: { me: Me | null }) => {
  const membership = boardSpace.useMembership()
  const [dots, setDots] = useState<BoardDot[]>([])
  const canDraw = me !== null

  // every click anyone makes is broadcast space-wide; append each dot as it arrives — guests included
  boardDotHandler(membership).useOnMessageFromServer(({ message }) => {
    setDots((prev) => [...prev, message])
  })

  return (
    <div className="space-y-3">
      <div
        className={`relative h-96 w-full overflow-hidden rounded-xl border border-slate-300 bg-white ${canDraw ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        onClick={(e) => {
          if (!canDraw) return // courtesy only — the server refuses a guest's click regardless
          const rect = e.currentTarget.getBoundingClientRect()
          const x = (e.clientX - rect.left) / rect.width
          const y = (e.clientY - rect.top) / rect.height
          void boardClickHandler(membership)
            .sendToServer({ x, y })
            .catch((error) => alert(error.message))
        }}
      >
        {dots.map((dot, i) => (
          <span
            key={i}
            title={dot.nickname}
            className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${dot.x * 100}%`, top: `${dot.y * 100}%`, backgroundColor: dot.color }}
          />
        ))}
        {dots.length === 0 && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            {canDraw
              ? 'Click anywhere — everyone connected sees your dots.'
              : 'Dots appear here live — sign in to draw your own.'}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500">
        {dots.length} {dots.length === 1 ? 'dot' : 'dots'} this session. Nothing is stored — reload and the board is
        empty again.{!canDraw && ' You are spectating — sign in from the header to draw.'}
      </p>
    </div>
  )
}

export const boardPage = generalLayout
  .lets('page', 'board', '/board')
  .head('Live board')
  .use(mePlugin)
  .page(({ props: { me } }) => {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Live board</h1>
          <p className="text-slate-600">
            A single shared room with no database. Each click sends to the server, which broadcasts it space-wide with a
            bare <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">sendToClient</code> — every connected client
            gets the dot, guests included.
          </p>
        </div>
        <BoardView me={me} />
      </div>
    )
  })

import { generalLayout } from '@/layouts/general.js'
import type { Me } from '@/lib/auth'
import { mePlugin } from '@/lib/auth'
import { appChannel } from '@/lib/channel'
import { AppError } from '@/lib/error'
import { colorForNickname } from '@/lib/colors'
import { prisma } from '@/lib/prisma'
import { chatTopicSchema, type ChatTopic } from '@/lib/topics'
import { root } from '@/lib/root'
import { TopicPicker } from '@/ui/topic-picker'
import { useEffect, useRef, useState } from 'react'
import * as z from 'zod'

/**
 * Chat: topics with persisted messages — each topic is one ROOM of the chat space. The whole feature — the space, the
 * two handlers, the history query and the component — is declared in this one file; the compiler keeps the server code
 * (Prisma, the reply) out of the client bundle and the component out of the server bundle.
 */

export const messageSchema = z.object({
  id: z.number(),
  topic: z.string(),
  nickname: z.string(),
  text: z.string(),
  createdAt: z.date(),
})
export type ChatMessage = z.infer<typeof messageSchema>

// the opener declares the room shape — every joiner return and every push target is checked against it. The input
// schema IS the gate: an unknown topic fails validation with a typed error before the joiner runs, so the joiner is
// a pure pass-through (returning `undefined` remains the tool for AUTHORIZATION denies — this space has none)
export const chatSpace = appChannel.lets
  .space<{ topic: ChatTopic }>()
  .input(z.object({ topic: chatTopicSchema }))
  .joiner(({ input: { topic } }) => ({ topic }))
  .space()

// client → server: persist a message, then push it to the whole room (sender included). Guests can WATCH the room
// (the joiner admits everyone) but not write — and the gate lives HERE, on the server, where the identity is
// trusted: a disabled input is courtesy, this throw is the rule
export const messageSendHandler = chatSpace.lets
  .serverHandler()
  .clientSend(z.object({ text: z.string().min(1).max(500) }))
  .serverReply(async ({ input: { text }, identity: { nickname }, room: { topic } }) => {
    if (nickname === null) {
      throw new AppError('Sign in to chat', { code: 'UNAUTHORIZED', status: 401 })
    }
    const message = await prisma.message.create({
      data: { topic, nickname, text },
    })
    void messageReceivedHandler.sendToClient(message, { room: { topic } })
    return message // what the sender gets back
  })
  .serverHandler()

// server → client: a new message arrived in the room — the payload IS the persisted message. `resumable` opts the
// pushes into the channel's resume buffer: a short blip replays the missed messages in order instead of losing them,
// and `onEnter` then reports `gapless: true` — no refetch needed
export const messageReceivedHandler = chatSpace.lets
  .clientHandler()
  .serverSend(messageSchema)
  .clientHandler({ resumable: true })

// the source of truth for chat history: an ordinary HTTP query. Pushes only write into its cache; a gap the resume
// buffer could not cover (`gapless: false`) refetches this instead of trusting the pushes.
export const chatHistoryQuery = root.lets
  .query()
  .input(z.object({ topic: chatTopicSchema }))
  .loader(async ({ input: { topic } }) => {
    // the LAST 100 — a chat shows its tail, so the newest ids win the cap; flip back to ascending for the render
    const messages = await prisma.message.findMany({
      where: { topic },
      orderBy: { id: 'desc' },
      take: 100,
    })
    return { messages: messages.reverse() }
  })
  .query()

const ChatTopicView = ({ topic, me }: { topic: ChatTopic; me: Me | null }) => {
  // catch-up in ONE condition: `gapless` is the server's proof that nothing was missed — true on the first enter and
  // on a resume whose buffer replayed every message (the channel is `resumable`, this handler opted in). Anything
  // else — a full reconnect, a resume past the buffer, a space-kick comeback — refetches the room's history
  const membership = chatSpace.useMembership(
    { topic },
    {
      onEnter: ({ gapless }) => {
        if (!gapless) void chatHistoryQuery.invalidateQuery({ topic })
      },
    },
  )
  // refetchOnMount 'always': pushes keep only the CURRENT room fresh — the others age invisibly, so returning to a
  // room shows the cached list instantly and quietly refetches it in the background
  const history = chatHistoryQuery.useQuery({ topic }, { refetchOnMount: 'always' })
  const [text, setText] = useState('')

  // a push is a signal — write the new message straight into the query's cache (deduped by id).
  // `old` is `undefined` until the history query has resolved — the updater param is typed nullable to match.
  messageReceivedHandler(membership).useOnMessageFromServer(({ message }) => {
    chatHistoryQuery.setQueryData({ topic }, (old) => {
      const messages = old?.messages ?? []
      if (messages.some((m) => m.id === message.id)) return { messages }
      return { messages: [...messages, message] }
    })
  })

  const messages = history.data?.messages ?? []

  // keep the list pinned to the newest message — a chat reads bottom-up, so the scroll follows the tail
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const list = listRef.current
    if (list) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages.length])

  return (
    <div className="space-y-3">
      <div ref={listRef} className="h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet — say hello.</p>}
        {messages.map((message) => (
          <div key={message.id} className="text-sm">
            <span className="font-semibold" style={{ color: colorForNickname(message.nickname) }}>
              {message.nickname}
            </span>
            <span className="text-slate-400"> · {message.createdAt.toLocaleTimeString()}</span>
            <div className="text-slate-800">{message.text}</div>
          </div>
        ))}
      </div>
      {me === null ? (
        // a guest watches the room live — writing is the signed-in action (and the SERVER enforces it either way)
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          You are watching as a guest — sign in from the header to write.
        </p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const value = text.trim()
            if (!value) return
            setText('')
            void messageSendHandler(membership)
              .sendToServer({ text: value })
              .catch((error) => alert(error.message))
          }}
        >
          <input
            className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-blue-400 focus:ring focus:ring-blue-200"
            placeholder={`Message #${topic}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={membership.status !== 'joined'}
          />
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-blue-300"
            type="submit"
            disabled={membership.status !== 'joined'}
          >
            Send
          </button>
        </form>
      )}
    </div>
  )
}

export const chatPage = generalLayout
  .lets('page', 'chat', '/chat')
  .head('Chat')
  // the page adapts to the viewer: `.use(mePlugin)` puts `{ me }` into the props — the signed-in user, or `null`
  // for a guest. The connection itself lives at the app root (app.client.tsx), not here.
  .use(mePlugin)
  .page(({ props: { me } }) => {
    const [topic, setTopic] = useState<ChatTopic>('general')
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Chat</h1>
          <p className="text-slate-600">
            Messages are persisted with Prisma, sent through a space server handler, and pushed to everyone in the
            topic's room. Everyone — guests included — watches live; writing needs a nickname. Open another tab on the
            same topic to see messages arrive.
          </p>
        </div>
        <TopicPicker topic={topic} onTopic={setTopic} />
        {/* remount the view when the topic changes so the membership + history follow it */}
        <ChatTopicView key={topic} topic={topic} me={me} />
      </div>
    )
  })

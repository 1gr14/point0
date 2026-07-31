import { generalLayout } from '@/layouts/general.js'
import { mePlugin } from '@/lib/auth'
import { appChannel } from '@/lib/channel'
import { colorForNickname } from '@/lib/colors'
import { chatTopicSchema, type ChatTopic } from '@/lib/topics'
import { TopicPicker } from '@/ui/topic-picker'
import { useState } from 'react'
import * as z from 'zod'

/**
 * Presence: who is on the topic right now. Its own space over the same topic names as the chat — the whole recipe (the
 * space, the join/leave listener that computes the list, the push and the socket query) is declared here.
 */

// the opener declares the room shape; the joiner is what makes the space joinable from the browser at all — the
// topic ENUM on the input is the whole gate (an unknown topic fails validation before the joiner runs)
export const presenceSpace = appChannel.lets
  .space<{ topic: ChatTopic }>()
  .input(z.object({ topic: chatTopicSchema }))
  .joiner(({ input: { topic } }) => ({ topic }))
  // presence: on every join and leave the server computes the member list ONCE and pushes the READY data to the
  // room — every member just applies it (setSocketQueryData), nobody fires a refetch request. The success event
  // fires after the room is registered, so the joiner is already in `memberships.server.list`. GUESTS join too
  // (they watch the list live) but are not COUNTED — presence lists people, and a guest has no name to list
  .serverOn(['pointSpaceJoinServerSuccess', 'pointSpaceLeaveServer'], async (event) => {
    for (const room of event.data.rooms as Array<{ topic: ChatTopic }>) {
      void presenceChangedHandler.sendToClient({ nicknames: await namesOnTopic(room) }, { room })
    }
  })
  .space()

// one nickname per person (several tabs = several connections), guests filtered out — the ONE list computation
const namesOnTopic = async (room: { topic: ChatTopic }): Promise<string[]> => {
  const here = await presenceSpace.memberships.server.list({ room })
  const nicknames = here
    .map((membership) => membership.identity.nickname)
    .filter((nickname): nickname is string => nickname !== null)
  return [...new Set(nicknames)].sort()
}

// server → client: the room's presence changed — the push CARRIES the fresh member list
export const presenceChangedHandler = presenceSpace.lets
  .clientHandler()
  .serverSend(z.object({ nicknames: z.array(z.string()) }))
  .clientHandler()

// client → server, a query: who is currently in this room
export const whoIsHereHandler = presenceSpace.lets
  .serverHandler()
  .serverReply(async ({ room }) => ({ nicknames: await namesOnTopic(room) }))
  .query()
  .serverHandler()

const PresenceTopicView = ({ topic }: { topic: ChatTopic }) => {
  const membership = presenceSpace.useMembership({ topic })
  const here = whoIsHereHandler(membership).useSocketQuery()

  // the push CARRIES the fresh list — apply it straight into the query cache, zero refetch requests
  presenceChangedHandler(membership).useOnMessageFromServer(({ message }) => {
    whoIsHereHandler(membership).setSocketQueryData(undefined, () => ({ nicknames: message.nicknames }))
  })

  const nicknames = here.data?.nicknames ?? []

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        {nicknames.length} {nicknames.length === 1 ? 'person' : 'people'} on{' '}
        <span className="font-medium">#{topic}</span>
      </p>
      <ul className="flex flex-wrap gap-2">
        {nicknames.map((nickname) => (
          <li
            key={nickname}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: colorForNickname(nickname) }}
            />
            <span className="font-medium text-slate-800">{nickname}</span>
          </li>
        ))}
        {nicknames.length === 0 && <li className="text-sm text-slate-400">Nobody here yet.</li>}
      </ul>
    </div>
  )
}

export const presencePage = generalLayout
  .lets('page', 'presence', '/presence')
  .head('Presence')
  .use(mePlugin)
  .page(({ props: { me } }) => {
    const [topic, setTopic] = useState<ChatTopic>('general')
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Presence</h1>
          <p className="text-slate-600">
            The live member list comes from the space's membership enumerations; a join or leave computes it once on the
            server and pushes the ready list to the topic's room. Open this page in another tab, on the same topic, and
            watch it grow.
          </p>
        </div>
        <TopicPicker topic={topic} onTopic={setTopic} />
        {me === null && (
          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
            You are watching as a guest — the list updates live for you, but only signed-in people appear in it.
          </p>
        )}
        <PresenceTopicView key={topic} topic={topic} />
      </div>
    )
  })

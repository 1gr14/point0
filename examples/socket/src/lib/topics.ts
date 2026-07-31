import * as z from 'zod'

/**
 * The topic names the chat and presence pages share — a plain constant, not a point. Both pages open their own space
 * over these names (each topic is one ROOM of the space), and `ui/topic-picker.tsx` renders the switcher.
 *
 * The zod ENUM is the whole gate: both spaces take it as the join input schema, so an unknown topic fails the input
 * validation with a typed error before any joiner runs — no hand-written checks anywhere.
 */
export const CHAT_TOPICS = ['general', 'random', 'tech'] as const

export const chatTopicSchema = z.enum(CHAT_TOPICS)

export type ChatTopic = z.infer<typeof chatTopicSchema>

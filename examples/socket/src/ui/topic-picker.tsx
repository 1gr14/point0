import { CHAT_TOPICS, type ChatTopic } from '@/lib/topics'

type TopicPickerProps = {
  topic: ChatTopic
  onTopic: (topic: ChatTopic) => void
}

export const TopicPicker = ({ topic, onTopic }: TopicPickerProps) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-500">Topic:</span>
      {CHAT_TOPICS.map((t) => (
        <button
          key={t}
          className={
            t === topic
              ? 'rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white'
              : 'rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200'
          }
          onClick={() => onTopic(t)}
        >
          {t}
        </button>
      ))}
    </div>
  )
}

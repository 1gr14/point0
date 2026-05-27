import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { x, y } from './x333'
import { useState } from 'react'
import { AppError } from '@/lib/error'

export const ideaBestComponent = root.lets
  .component<{ cta: string }>()
  .loader(async () => {
    return {
      // fake best idea
      bestIdea: await prisma.idea.findFirstOrThrow({ orderBy: { id: 'desc' } }),
    }
  })
  .wrapper(({ children }) => {
    return <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">{children}</div>
  })
  .component(({ data, props }) => {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-900">Best Idea: {data.bestIdea.title}</h2>
        <p className="text-sm text-slate-600">{props.cta}</p>
        <p>
          <Link
            className="font-medium text-blue-700 hover:text-blue-600"
            route="ideaView"
            input={{ id: data.bestIdea.id }}
          >
            View Idea Details
          </Link>
        </p>
      </div>
    )
  })

export const randomMutation = root.lets
  .mutation()
  .loader(async () => {
    return {
      random: 1238,
    }
  })
  .mutation()

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .page(() => {
    const [items, setItems] = useState<Todo[]>([])
    const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
    const [draft, setDraft] = useState('')

    const visibleItems = items.filter((item) => {
      if (filter === 'active') return !item.done
      if (filter === 'done') return item.done
      return true
    })

    const stats = {
      total: items.length,
      done: items.filter((item) => item.done).length,
    }

    const addItem = () => {
      if (!draft.trim()) return
      setItems([...items, { id: Date.now(), text: draft, done: false }])
      setDraft('')
    }

    const toggleItem = (id: number) => {
      setItems(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
    }

    return (
      <div className="mx-auto  space-y-6">
        <div className="space-y-2">
          <h1
            className="text-3xl font-bold tracking-tight text-slate-900"
            onClick={() => randomMutation.fetchMutation().then((res) => console.log(res, new Error('zxc').stack))}
          >
            Welcome to IdeaNick{x()}!{y}
          </h1>
          <p
            className="text-slate-600"
            onClick={() =>
              randomMutation.fetchMutation().then(() => {
                addItem()
                toggleItem(items[0].id)
              })
            }
          >
            Read about this project{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-600" route="about">
              here
            </Link>
          </p>
        </div>
        <div>
          <ideaBestComponent.X cta="It is awesome!" />
        </div>
      </div>
    )
  })

export function MyComponent() {
  const [count, setCount] = useState(0)
  const increment = () => setCount(count + 1)
  return (
    <div>
      MyComponent<button onClick={increment}>Click</button>
    </div>
  )
}

type Todo = { id: number; text: string; done: boolean }

export function TodoList({ title }: { title: string }) {
  const [items, setItems] = useState<Todo[]>([])
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all')
  const [draft, setDraft] = useState('')

  const visibleItems = items.filter((item) => {
    if (filter === 'active') return !item.done
    if (filter === 'done') return item.done
    return true
  })

  const stats = {
    total: items.length,
    done: items.filter((item) => item.done).length,
  }

  const addItem = () => {
    if (!draft.trim()) return
    setItems([...items, { id: Date.now(), text: draft, done: false }])
    setDraft('')
  }

  const toggleItem = (id: number) => {
    setItems(items.map((item) => (item.id === id ? { ...item, done: !item.done } : item)))
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-lg font-semibold">
        {title} ({stats.done}/{stats.total})
      </h3>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What needs doing?"
          className="flex-1 rounded border px-2 py-1"
        />
        <button onClick={addItem} className="rounded bg-blue-600 px-3 py-1 text-white">
          Add
        </button>
      </div>
      <div className="flex gap-2">
        {(['all', 'active', 'done'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={filter === f ? 'font-bold' : ''}>
            {f}
          </button>
        ))}
      </div>
      <ul>
        {visibleItems.map((item) => (
          <li
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={item.done ? 'line-through text-slate-400' : ''}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </div>
  )
}

import { generalLayout } from '@/layouts/general'
import { ideaCreateSchema, ideaUpdateSchema, ideaViewQuery } from '@/lib/idea'
import { navigate } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { useState } from 'react'

export const ideaCreateMutation = root.lets
  .mutation()
  .input(ideaCreateSchema)
  .loader(async ({ input }) => {
    const { image, ...rest } = input
    const imageBase64 = input.image ? Buffer.from(await input.image.arrayBuffer()).toString('base64') : undefined
    const idea = await prisma.idea.create({
      data: {
        ...rest,
        ...(image ? { image: imageBase64 } : {}),
      },
    })
    return { idea }
  })
  .mutation({
    onSuccess: async ({ idea }) => {
      ideaViewQuery.setQueryData({ id: idea.id }, { idea })
    },
  })

export const ideaUpdateMutation = root.lets
  .mutation()
  .input(ideaUpdateSchema)
  .loader(async ({ input }) => {
    const { id, image, ...rest } = input
    const imageBase64 = image ? Buffer.from(await image.arrayBuffer()).toString('base64') : undefined
    const idea = await prisma.idea.update({
      where: { id },
      data: {
        ...rest,
        ...(imageBase64 ? { image: imageBase64 } : {}),
      },
    })
    return { idea }
  })
  .mutation({
    onSuccess: async ({ idea }) => {
      ideaViewQuery.setQueryData({ id: idea.id }, { idea })
    },
  })

const inputClassName =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring'

const labelClassName = 'text-sm font-medium text-slate-700'

export const ideaCreatePage = generalLayout.lets
  .page('/ideas/new')
  .head('New Idea')
  .page(() => {
    const mutation = ideaCreateMutation.useMutation()
    const [title, setTitle] = useState(() => 'a')
    const [description, setDescription] = useState('b')
    const [content, setContent] = useState('c')
    const [image, setImage] = useState<File | undefined>(undefined)

    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Idea</h1>
        <form
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            void mutation
              .mutateAsync(
                { title, description, content, image },
                {
                  onSuccess: async ({ idea }) => {
                    await navigate('ideaView', { id: idea.id })
                  },
                },
              )
              .catch((error) => {
                alert(error.message)
              })
          }}
        >
          <div className="space-y-1.5">
            <label className={labelClassName}>Title</label>
            <input
              className={inputClassName}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Description</label>
            <input
              className={inputClassName}
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Content</label>
            <input
              className={inputClassName}
              type="text"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Image</label>
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0] || undefined
                setImage(file)
              }}
            />
          </div>
          {image && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <p>Selected file: {image.name}</p>
              <p>Size: {image.size} bytes</p>
            </div>
          )}
          <button
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Idea'}
          </button>
        </form>
      </div>
    )
  })

export const ideaUpdatePage = generalLayout.lets
  .page('/ideas/:id/edit')
  .with(ideaViewQuery, ({ params: { id } }) => ({ id: +id }))
  .head(({ data: { idea } }) => `Edit Idea: ${idea.title}`)
  .page(({ data: { idea } }) => {
    // any hook or whatever here, it is just client code
    const mutation = ideaUpdateMutation.useMutation()
    const [title, setTitle] = useState(() => idea.title)
    const [description, setDescription] = useState(idea.description)
    const [content, setContent] = useState(idea.content)
    const [image, setImage] = useState<File | undefined>(undefined)

    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Edit Idea: {idea.title}</h1>
        <form
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            void mutation
              .mutateAsync(
                { id: idea.id, title, description, content, image },
                {
                  onSuccess: async () => {
                    await navigate('ideaView', { id: idea.id })
                  },
                },
              )
              .catch((error) => {
                alert(error.message)
              })
          }}
        >
          <div className="space-y-1.5">
            <label className={labelClassName}>Title</label>
            <input
              className={inputClassName}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Description</label>
            <input
              className={inputClassName}
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Content</label>
            <input
              className={inputClassName}
              type="text"
              value={content}
              onChange={(e) => {
                setContent(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClassName}>Image</label>
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0] || undefined
                setImage(file)
              }}
            />
          </div>
          {image && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <p>Selected file: {image.name}</p>
              <p>Size: {image.size} bytes</p>
            </div>
          )}
          <button
            className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Updating...' : 'Update Idea'}
          </button>
        </form>
      </div>
    )
  })

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
    return prisma.idea.create({
      data: {
        ...rest,
        ...(image ? { image: imageBase64 } : {}),
      },
    })
  })
  .mutation()

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
      <div>
        <h1>New Idea</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void mutation.mutateAsync({ title, description, content, date: new Date(), image })
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
            }}
          />
          <label>Description</label>

          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
            }}
          />
          <label>Content</label>

          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
            }}
          />
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0] || undefined
              setImage(file)
            }}
          />
          {image && (
            <div>
              <p>Selected file: {image.name}</p>
              <p>Size: {image.size} bytes</p>
            </div>
          )}

          <button type="submit" disabled={mutation.isPending}>
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
      <div>
        <h1>Edit Idea: {idea.title}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void mutation.mutateAsync(
              { id: idea.id, title, description, content, date: new Date(), image },
              {
                onSuccess: async () => {
                  await navigate('ideaView', { id: idea.id })
                },
              },
            )
          }}
        >
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
            }}
          />
          <label>Description</label>

          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
            }}
          />
          <label>Content</label>

          <input
            type="text"
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
            }}
          />
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0] || undefined
              setImage(file)
            }}
          />
          {image && (
            <div>
              <p>Selected file: {image.name}</p>
              <p>Size: {image.size} bytes</p>
            </div>
          )}

          <button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Updating...' : 'Update Idea'}
          </button>
        </form>
      </div>
    )
  })

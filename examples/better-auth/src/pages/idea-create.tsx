import { generalLayout } from '@/layouts/general'
import { authorizedOnlyPlugin } from '@/lib/auth/utils'
import { ideaCreateSchema, ideaPrismaSelect, ideaViewQuery } from '@/lib/idea'
import { navigate } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'
import { Field } from '@/ui/field'
import { Input } from '@/ui/input'
import { Textarea } from '@/ui/textarea'
import { useState } from 'react'

export const ideaCreateMutation = root.lets
  .mutation()
  .input(ideaCreateSchema)
  .use(authorizedOnlyPlugin)
  .loader(async ({ ctx: { me }, input }) => {
    const { image, ...rest } = input
    const imageBase64 = input.image ? Buffer.from(await input.image.arrayBuffer()).toString('base64') : undefined
    const idea = await prisma.idea.create({
      data: {
        ...rest,
        userId: me.user.id,
        ...(image ? { image: imageBase64 } : {}),
      },
      select: ideaPrismaSelect,
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
  .use(authorizedOnlyPlugin)
  .page(() => {
    const mutation = ideaCreateMutation.useMutation()
    const [title, setTitle] = useState(() => '')
    const [description, setDescription] = useState('')
    const [content, setContent] = useState('')
    const [image, setImage] = useState<File | undefined>(undefined)

    return (
      <div className="space-y-5">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">New Idea</h1>
        <form
          className="space-y-4"
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
          <Input
            label="Title"
            value={title}
            onValueChange={(nextValue) => {
              setTitle(nextValue)
            }}
          />
          <Input
            label="Description"
            value={description}
            onValueChange={(nextValue) => {
              setDescription(nextValue)
            }}
          />
          <Textarea
            label="Content"
            rows={5}
            value={content}
            onValueChange={(nextValue) => {
              setContent(nextValue)
            }}
          />
          <Field label="Image">
            <input
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0] || undefined
                setImage(file)
              }}
            />
          </Field>
          {image && (
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
              <p>Selected file: {image.name}</p>
              <p>Size: {image.size} bytes</p>
            </div>
          )}
          <button
            className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Idea'}
          </button>
        </form>
      </div>
    )
  })

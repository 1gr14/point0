import { ideaLayout } from '@/layouts/idea.js'
import { Link } from '@/lib/navigation'

export const ideaViewPage = ideaLayout.lets
  .page('/')
  // We can read the idea straight from the layout, like from a provider
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  // ..or have own loader
  // .loader(async ({ params }) => {
  //   const idea = await prisma.idea.findUniqueOrThrow({
  //     where: { id: +params.id },
  //   })
  //   return { idea }
  // })
  // ...or reuse a query instead
  // .with(ideaViewQuery, ({ params: { id } }) => ({ id: +id }))
  .head(({ props: { idea } }) => idea.title)
  .page(({ props: { idea } }) => {
    return (
      <div className="space-y-5">
        <p className="rounded-lg bg-slate-100 px-4 py-3 text-slate-700">
          <b>{idea.description}</b>
        </p>

        {idea.image && (
          <img
            className="max-h-96 w-full rounded-xl border border-slate-200 object-cover shadow-sm"
            src={`data:image/*;base64,${idea.image}`}
            alt={idea.title}
          />
        )}

        <p className="whitespace-pre-wrap text-slate-700">{idea.content}</p>

        <nav>
          <Link
            className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            route="ideaUpdate"
            input={{ id: idea.id }}
          >
            Edit Idea
          </Link>
        </nav>
      </div>
    )
  })

import { ideaLayout } from '@/layouts/idea.js'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'

export const ideaViewPage = ideaLayout.lets
  .page('/')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUniqueOrThrow({
      where: { id: +params.id },
    })
    return { idea }
  })
  // we can get idea right form layout as from provider
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  // or we can reuse query
  // .with(getIdeaQuery, ({ params: { id } }) => ({ id }))
  .head(({ props: { idea } }) => idea.title)
  .page(({ props: { idea } }) => {
    return (
      <div>
        <p>
          <b>{idea.description}</b>
        </p>

        {idea.image && <img src={`data:image/*;base64,${idea.image}`} alt={idea.title} />}

        <p>{idea.content}</p>

        <nav>
          <Link route="ideaUpdate" input={{ id: idea.id }}>
            Edit Idea
          </Link>
          <Link route="ideaList">← Back to Ideas</Link>
        </nav>
      </div>
    )
  })

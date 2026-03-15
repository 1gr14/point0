import { Link } from '@/lib/navigate'
import { routes } from '@/lib/routes'
import { root } from '@/lib/root'
import { prisma } from '@/lib/prisma'
import { ErrorPoint0 } from '@point0/core'

export default root
  .lets('page', 'idea', '/ideas/:id')
  .loader(async ({ params }) => {
    const idea = await prisma.idea.findUnique({
      where: { id: Number(params.id) },
      include: { author: true },
    })
    if (!idea) {
      throw new ErrorPoint0('Idea not found', { status: 404 })
    }
    return { idea }
  })
  .head(({ data: { idea } }) => idea.title)
  .page(({ data: { idea } }) => {
    return (
      <div>
        <h1>{idea.title}</h1>
        <p>{idea.content}</p>
        <p>
          Author: <b>{idea.author.name}</b>
        </p>
        <p>
          <Link to={routes.ideas()}>Back to ideas</Link>
        </p>
      </div>
    )
  })

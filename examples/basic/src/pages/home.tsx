import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigate'
import { prisma } from '@/lib/prisma'
import { root } from '@/lib/root'

export const ideaBestComponent = root.lets
  .component<{ cta: string }>()
  .loader(async () => {
    return {
      // fake best idea
      bestIdea: await prisma.idea.findFirstOrThrow({ orderBy: { id: 'desc' } }),
    }
  })
  .wrapper(({ children }) => {
    return <div style={{ padding: '10px', border: '1px solid #000' }}>{children}</div>
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  .component(({ data, props }) => {
    return (
      <div>
        <h1>Best Idea: {data.bestIdea.title}</h1>
        <p>{props.cta}</p>
        <p>
          <Link route="ideaView" input={{ id: data.bestIdea.id }}>
            View Idea Details
          </Link>
        </p>
      </div>
    )
  })

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'IdeaNick Forever!',
    titleTemplate: null,
  })
  .loading(() => {
    return <div>Loading...</div>
  })
  .page(() => {
    return (
      <div>
        <h1>Welocome to IdeaNick!</h1>
        <p>
          Read about this project <Link route="about">here</Link>
        </p>
        <ideaBestComponent.X cta="It is awesome!" />
      </div>
    )
  })

import { ideaLayout } from '../layouts/idea.js'
import { routes } from '../lib/routes.js'

export const ideasNewsPage = ideaLayout
  .lets('page')
  .id('ideaNewsPage')
  .route(routes.ideaNews)
  .title(({ data: { idea } }) => `${idea.news.length} news for idea "${idea.title}"`)
  .page(({ data: { idea } }) => {
    return (
      <div>
        <h3>News</h3>
        <div>
          {idea.news.map((newsItem) => (
            <div key={newsItem.id} style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid #ccc' }}>
              <h4>{newsItem.title}</h4>
              <p>{newsItem.content}</p>
            </div>
          ))}
        </div>
        <nav>
          <a href="/">← Back to Home</a>
        </nav>
      </div>
    )
  })

export default ideasNewsPage

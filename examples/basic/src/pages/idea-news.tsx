import { ideaLayout } from '../layouts/idea.js'

export const ideaNewsPage = ideaLayout.lets
  .page('/news')
  .with(() => ({ idea: ideaLayout.useValue('idea') }))
  .head(({ props: { idea } }) => `${idea.news.length} news for idea "${idea.title}"`)
  .page(({ props: { idea } }) => {
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

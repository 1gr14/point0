// import { useNavigate0 } from '@/lib/routes.js'
import { ideaLayout } from '../layouts/idea.js'
import { useEffect } from 'react'

export const ideaNewsPage = ideaLayout
  .lets('page', 'ideaNews', 'news')
  .prefetchOnLinkHover(2000)
  .page(
    ({ data: { idea }, input }) => `${idea.news.length} news for idea "${idea.title}"`,
    ({ data: { idea }, query }) => {
      // const navigate = useNavigate0()
      useEffect(() => {
        // navigate('home').catch(console.error)
        // navigate('idea', { id: idea.id, pp: 3, hash: 'zxc' }).catch(console.error)
      }, [])
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
    },
  )

export default ideaNewsPage

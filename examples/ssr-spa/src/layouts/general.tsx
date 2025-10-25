import { client } from '../lib/client'
import { Link } from '../lib/router'
import { routes } from '../lib/routes'

export const generalLayout = client.layout(({ children }) => {
  return (
    <div>
      <h1>IdeaNick</h1>
      <ul>
        <li>
          <Link to={routes.home()}>Hoe</Link>
        </li>
        <li>
          <Link to={routes.ideas()}>Browse Ideas</Link>
        </li>
        <li>
          <Link to={routes.newIdea()}>Create Idea</Link>
        </li>
      </ul>
      <hr />
      {children}
    </div>
  )
})

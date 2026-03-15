import { Link } from '@/lib/navigate'
import { routes } from '@/lib/routes'
import { root } from '@/lib/root'
import { mePlugin } from '@/lib/auth/utils'

export default root
  .lets('page', 'home', '/')
  .use(mePlugin)
  .head('Home')
  .page(({ props: { me } }) => {
    return (
      <div>
        <h1>Better Auth + Prisma + Point0</h1>
        {me ? (
          <div>
            <p>
              Signed in as <b>{me.user.name}</b> ({me.user.email})
            </p>
            <ul>
              <li>
                <Link to={routes.ideas()}>Ideas</Link>
              </li>
              <li>
                <Link to={routes.profile()}>Profile</Link>
              </li>
            </ul>
          </div>
        ) : (
          <div>
            <p>Please sign in to create ideas.</p>
            <Link to={routes.auth()}>Go to Auth</Link>
          </div>
        )}
      </div>
    )
  })

import { Link } from '@/lib/navigate'
import { root } from '@/lib/root'

export default root
  .lets('page', 'home', '/')
  .head('Home')
  .page(() => {
    console.info('Home page')
    return (
      <div>
        <h1>Point0 + Capacitor</h1>
        <p>Simple ideas app. No auth. Works on web and in Capacitor shells.</p>
        <p>
          <Link route="ideas">Go to ideas</Link>
        </p>
      </div>
    )
  })

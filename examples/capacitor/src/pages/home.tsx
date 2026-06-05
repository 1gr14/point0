import { Link } from '@/lib/navigation'
import { root } from '@/lib/root'
import gemUrl from '@/assets/gem.png'
import GemIcon from '@/assets/gem.svg?react'

export default root
  .lets('page', 'home', '/')
  .head('Home')
  .page(() => {
    console.info('Home page')
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={gemUrl} width={40} height={40} alt="gem" />
          <GemIcon width={40} height={40} />
          <h1>Point0 + Capacitor</h1>
        </div>
        <p>Simple ideas app. No auth. Works on web and in Capacitor shells.</p>
        <p>
          <Link route="ideas">Go to ideas</Link>
        </p>
      </div>
    )
  })

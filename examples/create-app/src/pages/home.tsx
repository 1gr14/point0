import { generalLayout } from '@/layouts/general.js'
import { Link } from '@/lib/navigate'

export default generalLayout
  .lets('page', 'home', '/')
  .head({
    title: 'My App Forever!',
    titleTemplate: null,
  })
  .page(() => {
    return (
      <div className="mx-auto  space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome to My App!</h1>
          <p className="text-slate-600">
            Read about this project{' '}
            <Link className="font-medium text-blue-700 hover:text-blue-600" route="about">
              here
            </Link>
          </p>
        </div>
      </div>
    )
  })

import { useState } from 'react'
import { authClient } from '@/lib/auth/core'
import { Link } from '@/lib/navigate'
import { routes } from '@/lib/routes'
import { root } from '@/lib/root'
import { authorizedOnlyPlugin } from '@/lib/auth/utils'

export default root
  .lets('page', 'profile', '/profile')
  .use(authorizedOnlyPlugin)
  .head('Profile')
  .page(({ props: { me } }) => {
    const [name, setName] = useState(me.user.name)
    const [status, setStatus] = useState('')

    if (!me) {
      return (
        <div>
          <p>You need to sign in.</p>
          <Link route="auth">Go to Auth</Link>
        </div>
      )
    }

    return (
      <div>
        <h1>Profile</h1>
        <p>Change your name. Your ideas will show this author name.</p>

        <div style={{ display: 'grid', gap: 8, maxWidth: 380 }}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </label>
          <button
            onClick={() => {
              setStatus('Saving...')
              void authClient.updateUser({ name }).then((result) => {
                if (result.error) {
                  setStatus(result.error.message ?? 'Failed')
                  return
                }
                setStatus('Saved')
              })
            }}
          >
            Save Name
          </button>
          {status ? <p>{status}</p> : null}
          <p>
            <Link route="ideas">Back to ideas</Link>
          </p>
        </div>
      </div>
    )
  })

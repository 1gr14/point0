import { useState } from 'react'
import { authClient } from '@/lib/auth/core'
import { mePlugin } from '@/lib/auth/utils'
import { Link, navigate } from '@/lib/navigate'
import { routes } from '@/lib/routes'
import { root } from '@/lib/root'

export default root
  .lets('page', 'auth', '/auth')
  .use(mePlugin)
  .head('Auth')
  .page(({ props: { me } }) => {
    const [name, setName] = useState('Author')
    const [email, setEmail] = useState('author@example.com')
    const [password, setPassword] = useState('password123')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    if (me) {
      return (
        <div>
          <p>
            You are already signed in as <b>{me.user.name}</b>.
          </p>
          <p>
            <Link to={routes.home()}>Home</Link> | <Link to={routes.ideas()}>Ideas</Link>
          </p>
        </div>
      )
    }

    return (
      <div>
        <h1>Auth</h1>
        <p>Email + password auth via Better Auth.</p>

        <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
          <label>
            Name
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </label>

          <label>
            Email
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
              }}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
            />
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={isPending}
              onClick={() => {
                setError('')
                setIsPending(true)
                void authClient.signUp
                  .email({ email, password, name })
                  .then((result) => {
                    if (result.error) {
                      setError(result.error.message ?? 'Sign up failed')
                      return
                    }
                    void navigate('ideas')
                  })
                  .finally(() => {
                    setIsPending(false)
                  })
              }}
            >
              Sign Up
            </button>

            <button
              disabled={isPending}
              onClick={() => {
                setError('')
                setIsPending(true)
                void authClient.signIn
                  .email({ email, password })
                  .then((result) => {
                    if (result.error) {
                      setError(result.error.message ?? 'Sign in failed')
                      return
                    }
                    void navigate('ideas')
                  })
                  .finally(() => {
                    setIsPending(false)
                  })
              }}
            >
              Sign In
            </button>
          </div>

          {error ? <p style={{ color: 'red' }}>{error}</p> : null}

          <p>
            <Link to={routes.home()}>Back Home</Link>
          </p>
        </div>
      </div>
    )
  })

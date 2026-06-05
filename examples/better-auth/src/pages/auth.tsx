import { generalLayout } from '@/layouts/general'
import { getMeQuery } from '@/lib/auth/api'
import { authClient } from '@/lib/auth/client'
import { redirectAuthorizedPlugin } from '@/lib/auth/plugins'
import { Link, navigate } from '@/lib/navigation'
import { Input } from '@/ui/input'
import { useState } from 'react'

export const signInPage = generalLayout.lets
  .page('/sign-in')
  .head('Sign In')
  .use(redirectAuthorizedPlugin)
  .page(() => {
    const [email, setEmail] = useState('x@example.com')
    const [password, setPassword] = useState('12345678')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign In</h1>
          <p className="mt-1 text-slate-600">
            Sign in with email and password.
            <br />
            Do not have an account?{' '}
            <Link route="signUp" className="font-medium text-blue-700 hover:text-blue-600">
              Sign up
            </Link>
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={(nextValue) => {
              setEmail(nextValue)
            }}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={(nextValue) => {
              setPassword(nextValue)
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              type="button"
              disabled={isPending}
              onClick={() => {
                setError('')
                setIsPending(true)
                void authClient.signIn
                  .email({ email, password })
                  .then((result) => {
                    if (result.error) {
                      throw result.error
                    }
                    return getMeQuery.refetchQuery()
                  })
                  .then(() => {
                    void navigate('home')
                  })
                  .catch((error) => {
                    setError(error.message ?? 'Sign in failed')
                  })
                  .finally(() => {
                    setIsPending(false)
                  })
              }}
            >
              {isPending ? 'Please wait...' : 'Sign In'}
            </button>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      </div>
    )
  })

export const signUpPage = generalLayout.lets
  .page('/sign-up')
  .head('Sign Up')
  .use(redirectAuthorizedPlugin)
  .page(() => {
    const [name, setName] = useState('Author')
    const [email, setEmail] = useState('author@example.com')
    const [password, setPassword] = useState('12345678')
    const [error, setError] = useState('')
    const [isPending, setIsPending] = useState(false)

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign Up</h1>
          <p className="mt-1 text-slate-600">
            Sign up with email and password.
            <br />
            Already have an account?{' '}
            <Link route="signIn" className="font-medium text-blue-700 hover:text-blue-600">
              Sign in
            </Link>
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Input
            label="Name"
            value={name}
            onValueChange={(nextValue) => {
              setName(nextValue)
            }}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onValueChange={(nextValue) => {
              setEmail(nextValue)
            }}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onValueChange={(nextValue) => {
              setPassword(nextValue)
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              type="button"
              disabled={isPending}
              onClick={() => {
                setError('')
                setIsPending(true)
                void authClient.signUp
                  .email({ email, password, name })
                  .then((result) => {
                    if (result.error) {
                      throw result.error
                    }
                    return getMeQuery.refetchQuery()
                  })
                  .then(() => {
                    void navigate('home')
                  })
                  .catch((error) => {
                    setError(error.message ?? 'Sign up failed')
                  })
                  .finally(() => {
                    setIsPending(false)
                  })
              }}
            >
              {isPending ? 'Please wait...' : 'Sign Up'}
            </button>
          </div>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      </div>
    )
  })

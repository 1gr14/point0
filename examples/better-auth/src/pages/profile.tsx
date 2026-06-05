import { generalLayout } from '@/layouts/general'
import { getMeQuery } from '@/lib/auth/api'
import { authClient, signOutClient } from '@/lib/auth/client'
import { redirectUnauthorizedPlugin } from '@/lib/auth/plugins'
import { Input } from '@/ui/input'
import { useState } from 'react'

export const profilePage = generalLayout.lets
  .page('/profile')
  .head('Profile')
  .use(redirectUnauthorizedPlugin)
  .page(({ props: { me } }) => {
    const [name, setName] = useState(me.user.name)
    const [nameStatus, setNameStatus] = useState('')
    const [nameError, setNameError] = useState('')
    const [isSavingName, setIsSavingName] = useState(false)
    const [signOutError, setSignOutError] = useState('')
    const [isSigningOut, setIsSigningOut] = useState(false)

    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="mt-1 text-slate-600">Manage your profile information and account session.</p>
        </div>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Update Name</h2>
          <Input
            label="Name"
            value={name}
            onValueChange={(nextValue) => {
              setName(nextValue)
            }}
          />
          <button
            className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            type="button"
            disabled={isSavingName}
            onClick={() => {
              setNameStatus('')
              setNameError('')
              setIsSavingName(true)
              void authClient
                .updateUser({ name })
                .then((result) => {
                  if (result.error) {
                    throw result.error
                  }
                  return getMeQuery.refetchQuery()
                })
                .then(() => {
                  setNameStatus('Name updated')
                })
                .catch((error) => {
                  setNameError(error.message ?? 'Failed to update name')
                })
                .finally(() => {
                  setIsSavingName(false)
                })
            }}
          >
            {isSavingName ? 'Saving...' : 'Save Name'}
          </button>
          {nameStatus ? <p className="text-sm font-medium text-emerald-700">{nameStatus}</p> : null}
          {nameError ? <p className="text-sm font-medium text-red-600">{nameError}</p> : null}
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Session</h2>
          <p className="text-sm text-slate-600">Sign out from your current account.</p>
          <button
            className="inline-flex rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            type="button"
            disabled={isSigningOut}
            onClick={() => {
              setSignOutError('')
              setIsSigningOut(true)
              signOutClient({
                onError: (error) => {
                  setSignOutError(error instanceof Error ? error.message : 'Failed to sign out')
                },
                onSettled: () => {
                  setIsSigningOut(false)
                },
              })
            }}
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
          {signOutError ? <p className="text-sm font-medium text-red-600">{signOutError}</p> : null}
        </section>
      </div>
    )
  })

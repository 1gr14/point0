import { CookiesStore } from '@point0/core'

const cookiesStore = CookiesStore.create()

export const testCookie = cookiesStore.define({ name: 'test' })

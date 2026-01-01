import { CookiesStore } from '@point0/core'
import SuperJSON from 'superjson'

CookiesStore.configure({
  transformer: SuperJSON,
})

export const testCookie = CookiesStore.define({ name: 'test' })
export const testStringDefaultCookie = CookiesStore.define<string>({ name: 'testStringDefault', value: 'hello' })
export const testNumberCookie = CookiesStore.define<number>({ name: 'testNumber' })
export const testNumberDefaultCookie = CookiesStore.define<number>({ name: 'testNumberDefault', value: 10 })
export const testServerCookie = CookiesStore.define({ name: 'testServer', httpOnly: true })

import { CookiesStore } from '@point0/core'
import SuperJSON from 'superjson'

CookiesStore.configure({
  transformer: SuperJSON,
})

export const testCookie = CookiesStore.define({ name: 'test' })
export const testCookie2 = CookiesStore.define('test2')
export const testStringDefaultCookie = CookiesStore.define<string>({ name: 'testStringDefault', fallback: 'hello' })
export const testNumberCookie = CookiesStore.define<number>({ name: 'testNumber' })
export const testNumberDefaultCookie = CookiesStore.define<number>({ name: 'testNumberDefault', fallback: 10 })
export const testServerCookie = CookiesStore.define({ name: 'testServer', httpOnly: true })

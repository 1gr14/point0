import { GlobalStore } from 'point0/core/global-store.js'

export const globalStore = await GlobalStore.create<{ x: number }>()

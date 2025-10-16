import { ClientPage0 } from './client-page.js'
import type { Pages0 } from './types.js'

export const renderServerPage0 = async (url: string, pages: Pages0) => {
  for (const [route, page0Getter] of pages) {
    const parseResult = route.parse(url)
    if (!parseResult.match) {
      continue
    }
    const page0 = page0Getter instanceof ClientPage0 ? page0Getter : await page0Getter()
  }
  throw new Error(`Page not found for url: ${url}`)
}

import { renderToStaticMarkup } from 'react-dom/server'
import { serverPage0 } from './server/page0.js'
import { clientPages } from './pages/index.js'

const isDev = import.meta.env.NODE_ENV === 'development'
const clientBundlePath = isDev ? '/@vite/client' : '/assets/main.js'

export async function render(url: string, clientBundlePathOverride?: string) {
  const html = await serverPage0.renderStatic({
    path: url,
    clientPages,
    renderer: renderToStaticMarkup,
    clientBundlePath: clientBundlePathOverride ?? clientBundlePath,
  })
  return html
}

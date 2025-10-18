import { renderToStaticMarkup } from 'react-dom/server'
import { serverPoint0 } from './server/point0.js'
import { pages } from './pages/index.js'

const isDev = import.meta.env.NODE_ENV === 'development'
const clientBundlePath = isDev ? '/@vite/client' : '/assets/main.js'

export async function render(url: string, clientBundlePathOverride?: string) {
  const html = await serverPoint0.renderStatic({
    path: url,
    pages,
    renderer: renderToStaticMarkup,
    clientBundlePath: clientBundlePathOverride ?? clientBundlePath,
  })
  return html
} // TODO: remove this file

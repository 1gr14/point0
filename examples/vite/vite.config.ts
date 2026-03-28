import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineViteConfig } from '@point0/engine/utils'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
// import { analyzer } from 'vite-bundle-analyzer'

export default defineViteConfig(() => {
  return {
    plugins: [
      react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
      svgr(),
      tsconfigPaths({ loose: true }),
      // options.side === 'client' ? analyzer() : null,
    ] as PluginOption[],
  }
})

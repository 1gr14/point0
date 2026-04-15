import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineViteConfig } from '@point0/engine/utils'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
// import { analyzer } from 'vite-bundle-analyzer'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default defineViteConfig((options) => {
  return {
    plugins: [
      react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
      tailwindcss(),
      svgr(),
      tsconfigPaths({ loose: true }),
      // options.side === 'client' ? analyzer() : null,
    ] as PluginOption[],
  }
})

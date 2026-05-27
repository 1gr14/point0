import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineViteConfig } from '@point0/engine/utils'
import svgr from 'vite-plugin-svgr'
import tailwindcss from '@tailwindcss/vite'
// import { analyzer } from 'vite-bundle-analyzer'

export default defineViteConfig(({ plugins }) => {
  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [
      ...plugins,
      react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
      svgr(),
      tailwindcss(),
      // side === 'client' ? analyzer() : null,
    ] as PluginOption[],
  }
})

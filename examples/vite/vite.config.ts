import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
import { analyzer } from 'vite-bundle-analyzer'

export default defineConfig((options) => {
  return {
    plugins: [
      react({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ }),
      svgr(),
      tsconfigPaths({ loose: true }),
      options.mode.includes('clientx') ? analyzer() : null,
    ] as PluginOption[],
  }
})

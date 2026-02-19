import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { analyzer } from 'vite-bundle-analyzer'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig((options) => {
  return {
    plugins: [react(), svgr(), tsconfigPaths(), options.mode.includes('clientx') ? analyzer() : null] as PluginOption[],
  }
})

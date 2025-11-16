import react from '@vitejs/plugin-react'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [svgr(), react()] as PluginOption[],
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      point0: new URL('../../src', import.meta.url).pathname,
    },
  },
})

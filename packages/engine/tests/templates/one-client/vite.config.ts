import { defineViteConfig } from '@point0/engine/utils'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineViteConfig(({ plugins }) => {
  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [...plugins, react(), svgr()],
    root: 'src',
  }
})

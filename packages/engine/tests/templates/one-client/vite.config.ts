import { defineViteConfig } from '@point0/engine/utils'
import react from '@vitejs/plugin-react'

export default defineViteConfig(({ plugins }) => {
  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [...plugins, react()],
    root: 'src',
  }
})

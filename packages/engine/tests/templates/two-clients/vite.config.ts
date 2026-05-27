import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { ExtractViteConfigOptions } from '@point0/engine/config'

export default (options: ExtractViteConfigOptions) => {
  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [react(), svgr()],
    root: 'src',
  }
}

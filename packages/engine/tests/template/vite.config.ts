import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'
import { ExtractViteConfigOptions } from '../../src/config.js'

export default (options: ExtractViteConfigOptions) => {
  return {
    plugins: [react(), svgr(), tsconfigPaths()],
    root: 'src',
  }
}

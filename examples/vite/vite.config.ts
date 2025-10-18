import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  build: {
    outDir: 'dist/client',
    rollupOptions: {
      input: {
        main: './entry-client.tsx',
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // manualChunks: {
        //   vendor: ['react', 'react-dom'],
        //   point0: ['point0/client', '@devp0nt/route0'],
        // },
      },
    },
  },
  // ssr: {
  //   noExternal: ['point0', '@devp0nt/route0'],
  // },
  server: {
    port: 5173,
  },
})

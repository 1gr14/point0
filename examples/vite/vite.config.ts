// import type { UserConfig } from 'vite'
// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// import svgr from 'vite-plugin-svgr'
// import commonjs from 'vite-plugin-commonjs'

// export default defineConfig({
//   plugins: [
//     commonjs(),
//     react(),
//     svgr({
//       svgrOptions: {
//         exportType: 'default',
//         ref: true,
//         svgo: false,
//         titleProp: true,
//       },
//       include: '**/*.svg',
//     }),
//   ] as UserConfig['plugins'],
//   build: {
//     outDir: 'dist/client',
//     minify: false,
//     sourcemap: true,
//     commonjsOptions: { transformMixedEsModules: true },
//     rollupOptions: {
//       // input: {
//       //   entry: './src/entry-client.ts',
//       //   app: './src/app.tsx',
//       // },
//       input: './src/entry-client.ts',
//       external: ['node:async_hooks'],
//       output: {
//         entryFileNames: (chunk) => {
//           // Keep clean name for your specific entry
//           if (chunk.name === 'app') return 'app.js'
//           return '[name].js'
//         },
//         chunkFileNames: '[name].js',
//         assetFileNames: '[name].[ext]',
//       },
//     },
//   },
//   optimizeDeps: {
//     exclude: ['node:async_hooks'], // don't prebundle it for browser
//   },
//   server: {
//     // port: 3001,
//     // strictPort: true,
//     // hmr: {
//     //   port: 3010 + Math.random() * 1000,
//     // },
//   },
//   resolve: {
//     alias: {
//       '@': new URL('./src', import.meta.url).pathname,
//       point0: new URL('../../src', import.meta.url).pathname,
//     },
//   },
// })

import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [svgr(), react()] as PluginOption[],
  clearScreen: false,
  build: {
    outDir: 'dist/client',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        // main: './src/index.html',
        app: './src/app.tsx',
        points: './src/lib/points.ready.ts',
        server: './src/lib/server.ts',
      },
      // external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.endsWith('.svg?react'),
      // external: (id) => id.includes('point0'),
      // external: ['point0/core/super-store.js'],
      // react exterbnal
      // external: ['react', 'react-dom', 'react-dom/client'],
      external: (id) => ['react', 'react-dom', 'react-dom/client'].includes(id),

      output: {
        format: 'es',
        // preserveModules: true,
        // preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      point0: new URL('../../src', import.meta.url).pathname,
    },
  },
})

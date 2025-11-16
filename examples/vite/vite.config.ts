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
import nodePath from 'node:path'

// export default defineConfig({
//   plugins: [svgr(), react()] as PluginOption[],
//   clearScreen: false,
//   build: {
//     outDir: 'dist/client',
//     minify: false,
//     sourcemap: true,
//     rollupOptions: {
//       input: {
//         // main: './src/index.html',
//         app: './src/app.tsx',
//         points: './src/lib/points.ready.ts',
//         // server: './src/lib/server.ts',
//       },
//       // external: (id) => !id.startsWith('.') && !id.startsWith('/') && !id.endsWith('.svg?react'),
//       // external: (id) => id.includes('point0'),
//       // external: ['point0/core/super-store.js'],
//       // react exterbnal
//       // external: ['react', 'react-dom', 'react-dom/client'],
//       external: (id) => ['react', 'react-dom', 'react-dom/client'].includes(id),

//       // preserveEntrySignatures: 'strict',
//       output: {
//         // format: 'es',
//         // preserveModules: true,
//         // preserveModulesRoot: 'src',
//         entryFileNames: '[name].js',
//         // chunkFileNames: '[name].js',
//         // assetFileNames: '[name].[ext]',

//         // manualChunks(id) {
//         //   // DO NOT bundle entries into shared chunks
//         //   if (id.includes('src/app.tsx')) return 'app'
//         //   if (id.includes('src/lib/points.ready.ts')) return 'points'

//         //   // Everything else goes to common bundle
//         //   if (id.includes('node_modules')) return 'vendor'
//         // },
//         minifyInternalExports: false,
//       },
//     },
//   },
//   resolve: {
//     alias: {
//       '@': new URL('./src', import.meta.url).pathname,
//       point0: new URL('../../src', import.meta.url).pathname,
//     },
//   },
// })

// export default defineConfig({
//   build: {
//     minify: false,
//     sourcemap: true,

//     rollupOptions: {
//       input: {
//         main: new URL('./index.html', import.meta.url).pathname,
//         app: './src/app.tsx',
//         points: './src/lib/points.ready.ts',
//       },

//       // 🚀 force Rollup to keep re-export statements exactly
//       treeshake: false,

//       preserveEntrySignatures: 'strict',

//       output: {
//         entryFileNames: '[name].js',

//         // 🚀 forbid internal export minification
//         minifyInternalExports: false,

//         // 🚀 prevent import rewriting / inlining
//         inlineDynamicImports: false,
//       },
//     },
//   },
//   resolve: {
//     alias: {
//       '@': new URL('./src', import.meta.url).pathname,
//       point0: new URL('../../src', import.meta.url).pathname,
//     },
//   },
// })
export default defineConfig({
  plugins: [svgr(), react()] as PluginOption[],
  clearScreen: false,
  build: {
    minify: false,
    sourcemap: true,

    // rollupOptions: {
    //   input: {
    //     main: new URL('./index.html', import.meta.url).pathname,
    //     app: './src/app.tsx',
    //     points: './src/lib/points.ready.ts',
    //   },

    //   // treeshake: {
    //   //   // Disable tree-shaking ONLY for your re-export barrel file
    //   //   moduleSideEffects(id, external) {
    //   //     if (id.includes('points.ready')) {
    //   //       return false // treat it as having side effects → no shake
    //   //     }
    //   //     return true // default behavior
    //   //   },
    //   //   // IMPORTANT: leave all other defaults ON
    //   //   // preset: 'recommended',
    //   // },

    //   preserveEntrySignatures: 'strict',

    //   output: {
    //     entryFileNames: '[name].js',
    //     minifyInternalExports: false,

    //     // MUST remain false → React requires chunk graph
    //     inlineDynamicImports: false,
    //   },
    // },
  },

  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      point0: new URL('../../src', import.meta.url).pathname,
      // '@': nodePath.resolve(__dirname, 'src'),
      // point0: nodePath.resolve(__dirname, '../../src'),
    },
  },
})

// CLIENT FOR SERVER
// export default defineConfig({
//   plugins: [svgr(), react()] as PluginOption[],
//   build: {
//     minify: false,
//     sourcemap: true,
//     // Disable module preloading to avoid SSR issues with document API
//     modulePreload: false,

//     rollupOptions: {
//       input: {
//         main: new URL('./index.html', import.meta.url).pathname,
//         app: './src/app.tsx',
//         points: './src/lib/points.ready.ts',
//       },

//       // Externalize React and React-DOM to avoid conflicts between server and client bundles
//       // This ensures both use the same React instance from node_modules
//       external: (id) => {
//         return id === 'react' || id === 'react-dom' || id === 'react-dom/client' || id === 'react/jsx-runtime'
//       },

//       // Preserve entry signatures to keep app and points export names as-is
//       preserveEntrySignatures: 'strict',

//       output: {
//         entryFileNames: '[name].js',
//         minifyInternalExports: false,

//         // MUST remain false → React requires chunk graph
//         inlineDynamicImports: false,
//       },
//     },
//   },

//   resolve: {
//     alias: {
//       '@': new URL('./src', import.meta.url).pathname,
//       point0: new URL('../../src', import.meta.url).pathname,
//     },
//   },
// })

import { describe, it, expect } from 'bun:test'
import { parseEngineOptions } from './config.js'

describe('parseEngineOptions', () => {
  it('should parse engine options', () => {
    const ENGINE_WAS_BUILT = false as boolean
    const options = parseEngineOptions({
      itWasBuilt: ENGINE_WAS_BUILT,
      cwdAfterBuild: !ENGINE_WAS_BUILT ? '../dist/server' : '/home/dist/server',
      cwdBeforeBuild: !ENGINE_WAS_BUILT ? '/home/src' : '../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        points: './lib/points.server.ts',
        port: 3000,
        entryFile: './entry-server.ts',
        distDir: '../dist/server',
        publicDistDir: '../dist/public',
        clientsDistDir: '../dist/server-clients',
      },
      clients: [
        {
          ssr: true,
          app: './app.js',
          points: './src/lib/points.ready.js',
          indexHtml: './src/index.html',
          port: 3001,
          env: ['SOURCE_BASE_URL'],
          publicDir: './src/public',
          distDir: '../dist/client',
          publicDistDir: '../dist/client',
        },
      ],
    })
    expect(options).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "app": "/home/src/app.js",
            "basepath": "/",
            "distDir": "/home/dist/client",
            "domRootElementId": "root",
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "hostname": null,
            "index": 0,
            "indexHtml": "/home/src/src/index.html",
            "points": "/home/src/src/lib/points.ready.js",
            "port": 3001,
            "publicDir": [
              [
                "/",
                "/home/src/src/public",
              ],
            ],
            "publicDistDir": "/home/dist/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "cwd": "/home/src",
          "cwdAfterBuild": "/home/dist/server",
          "cwdBeforeBuild": "/home/src",
          "fallbackRootId": null,
          "itWasBuilt": false,
          "logger": {
            "error": [Function: error],
            "info": [Function: info],
          },
        },
        "server": {
          "clientsDistDir": "/home/dist/server-clients",
          "distDir": "/home/dist/server",
          "entryFile": "/home/src/entry-server.ts",
          "hmrPort": 3100,
          "points": "/home/src/lib/points.server.ts",
          "port": 3000,
          "publicDir": [],
          "publicDistDir": "/home/dist/public",
        },
      }
    `)
  })

  it('should parse engine options when it was built', () => {
    const ENGINE_WAS_BUILT = true as boolean
    const options = parseEngineOptions({
      itWasBuilt: ENGINE_WAS_BUILT,
      cwdAfterBuild: !ENGINE_WAS_BUILT ? '../dist/server' : '/home/src',
      cwdBeforeBuild: !ENGINE_WAS_BUILT ? '/home/src' : '../../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        points: './lib/points.server.ts',
        port: 3000,
        entryFile: './entry-server.ts',
        distDir: '../dist/server',
        publicDistDir: '../dist/public',
        clientsDistDir: '../dist/server-clients',
      },
      clients: [
        {
          ssr: true,
          app: './app.js',
          points: './lib/points.ready.js',
          indexHtml: './index.html',
          port: 3001,
          env: ['SOURCE_BASE_URL'],
          publicDir: './public',
          distDir: '../dist/client',
          publicDistDir: '../dist/client',
        },
      ],
    })
    expect(options).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "app": "/dist/client/app.js",
            "basepath": "/",
            "distDir": "/dist/client",
            "domRootElementId": "root",
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "hostname": null,
            "index": 0,
            "indexHtml": "/dist/client/index.html",
            "points": "/dist/client/lib/points.ready.js",
            "port": 3001,
            "publicDir": [
              [
                "/",
                "/dist/client",
              ],
            ],
            "publicDistDir": "/dist/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "cwd": "/home/src",
          "cwdAfterBuild": "/home/src",
          "cwdBeforeBuild": "/src",
          "fallbackRootId": null,
          "itWasBuilt": true,
          "logger": {
            "error": [Function: error],
            "info": [Function: info],
          },
        },
        "server": {
          "clientsDistDir": "/dist/server-clients",
          "distDir": "/dist/server",
          "entryFile": "/dist/server/entry-server.js",
          "hmrPort": 3100,
          "points": "/dist/server/lib/points.server.js",
          "port": 3000,
          "publicDir": [
            [
              "/",
              "/dist/public",
            ],
          ],
          "publicDistDir": "/dist/public",
        },
      }
    `)
  })
})

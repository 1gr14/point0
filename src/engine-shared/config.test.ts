import { describe, it, expect } from 'bun:test'
import { parseEngineOptions } from './config.js'
import { omit } from 'lodash'

describe('parseEngineOptions', () => {
  it('should parse engine options', () => {
    const ENGINE_WAS_BUILT = false as boolean
    const options = parseEngineOptions({
      itWasBuilt: ENGINE_WAS_BUILT,
      cwdAfterBuild: !ENGINE_WAS_BUILT ? '../dist/server' : '/home/dist/server',
      cwdBeforeBuild: !ENGINE_WAS_BUILT ? '/home/src' : '../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        rootId: 'server',
        points: {} as never,
        port: 3000,
        entryFile: './entry-server.ts',
        distDir: '../dist/server',
        publicDistDir: '../dist/public',
      },
      clients: [
        {
          ssr: true,
          rootId: 'client',
          app: './app.js',
          points: './lib/points.ready.js',
          indexHtml: './index.html',
          port: 3001,
          env: ['SOURCE_BASE_URL'],
          publicDir: './public',
          distDir: '../dist/client',
          serverDistDir: '../dist/server-clients/client',
          publicDistDir: '../dist/client',
        },
      ],
    })
    expect(omit(options, ['server.points'])).toMatchInlineSnapshot(`
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
            "indexHtml": "/home/src/index.html",
            "points": "/home/src/lib/points.ready.js",
            "port": 3001,
            "publicDir": [
              [
                "/",
                "/home/src/public",
              ],
            ],
            "publicDistDir": "/home/dist/client",
            "rootId": "client",
            "serverDistDir": "/home/dist/server-clients/client",
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
          "clientsDistDir": null,
          "distDir": "/home/dist/server",
          "entryFile": "/home/src/entry-server.ts",
          "hmrPort": 3100,
          "port": 3000,
          "publicDir": [],
          "publicDistDir": "/home/dist/public",
          "rootId": "server",
        },
      }
    `)
  })

  it('should parse engine options when it was built', () => {
    const ENGINE_WAS_BUILT = true as boolean
    const options = parseEngineOptions({
      itWasBuilt: ENGINE_WAS_BUILT,
      cwdAfterBuild: !ENGINE_WAS_BUILT ? '../dist/server' : '/home/dist/server',
      cwdBeforeBuild: !ENGINE_WAS_BUILT ? '/home/src' : '../../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        rootId: 'server',
        points: {} as never,
        port: 3000,
        entryFile: './entry-server.ts',
        distDir: '../dist/server',
        publicDistDir: '../dist/public',
      },
      clients: [
        {
          ssr: true,
          rootId: 'client',
          app: './app.js',
          points: './lib/points.ready.js',
          indexHtml: './index.html',
          port: 3001,
          env: ['SOURCE_BASE_URL'],
          publicDir: './public',
          distDir: '../dist/client',
          serverDistDir: '../dist/server-clients/client',
          publicDistDir: '../dist/client',
        },
      ],
    })
    expect(omit(options, ['server.points'])).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "app": "/home/dist/server-clients/client/app.js",
            "basepath": "/",
            "distDir": "/home/dist/client",
            "domRootElementId": "root",
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "hostname": null,
            "index": 0,
            "indexHtml": "/home/dist/client/index.html",
            "points": "/home/dist/server-clients/client/lib/points.ready.js",
            "port": 3001,
            "publicDir": [
              [
                "/",
                "/home/dist/client",
              ],
            ],
            "publicDistDir": "/home/dist/client",
            "rootId": "client",
            "serverDistDir": "/home/dist/server-clients/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "cwd": "/home/dist/server",
          "cwdAfterBuild": "/home/dist/server",
          "cwdBeforeBuild": "/home/src",
          "fallbackRootId": null,
          "itWasBuilt": true,
          "logger": {
            "error": [Function: error],
            "info": [Function: info],
          },
        },
        "server": {
          "clientsDistDir": null,
          "distDir": "/home/dist/server",
          "entryFile": "/home/dist/server/entry-server.js",
          "hmrPort": 3100,
          "port": 3000,
          "publicDir": [
            [
              "/",
              "/home/dist/public",
            ],
          ],
          "publicDistDir": "/home/dist/public",
          "rootId": "server",
        },
      }
    `)
  })
})

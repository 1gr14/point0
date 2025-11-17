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
        entry: './entry-server.ts',
        outdir: '../dist/server',
        publicdirOutdir: '../dist/public',
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
          publicdir: './public',
          outdir: '../dist/client',
          serverOutdir: '../dist/clients-server/client',
          publicdirOutdir: '../dist/client',
        },
      ],
    })
    expect(omit(options, ['server.points'])).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "app": "/home/src/app.js",
            "basepath": "/",
            "domRootElementId": "root",
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "hostname": null,
            "index": 0,
            "indexHtml": "/home/src/index.html",
            "outdir": "/home/dist/client",
            "points": "/home/src/lib/points.ready.js",
            "port": 3001,
            "publicdir": [
              [
                "/",
                "/home/src/public",
              ],
            ],
            "publicdirOutdir": "/home/dist/client",
            "rootId": "client",
            "serverOutdir": "/home/dist/clients-server/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "clientsSelfOutdir": null,
          "clientsServerOutdir": null,
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
          "entry": {
            "main": "/home/src/entry-server.ts",
          },
          "hmrPort": 3100,
          "outdir": "/home/dist/server",
          "port": 3000,
          "publicdir": [],
          "publicdirOutdir": "/home/dist/public",
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
        entry: './entry-server.ts',
        outdir: '../dist/server',
        publicdirOutdir: '../dist/public',
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
          publicdir: './public',
          outdir: '../dist/client',
          serverOutdir: '../dist/clients-server/client',
          publicdirOutdir: '../dist/client',
        },
      ],
    })
    expect(omit(options, ['server.points'])).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "app": "/home/dist/clients-server/client/app.js",
            "basepath": "/",
            "domRootElementId": "root",
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "hostname": null,
            "index": 0,
            "indexHtml": "/home/dist/client/index.html",
            "outdir": "/home/dist/client",
            "points": "/home/dist/clients-server/client/points.ready.js",
            "port": 3001,
            "publicdir": [
              [
                "/",
                "/home/dist/client",
              ],
            ],
            "publicdirOutdir": "/home/dist/client",
            "rootId": "client",
            "serverOutdir": "/home/dist/clients-server/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "clientsSelfOutdir": null,
          "clientsServerOutdir": null,
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
          "entry": {
            "main": "/home/dist/server/entry-server.js",
          },
          "hmrPort": 3100,
          "outdir": "/home/dist/server",
          "port": 3000,
          "publicdir": [],
          "publicdirOutdir": "/home/dist/public",
          "rootId": "server",
        },
      }
    `)
  })
})

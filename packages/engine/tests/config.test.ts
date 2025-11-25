import { describe, it, expect } from 'bun:test'
import { parseEngineOptions } from '../src/config.js'
import { omit } from 'lodash'
import { Point0 } from '@point0/core'

describe('parseEngineOptions', () => {
  it('should parse engine options', () => {
    const ENGINE_WAS_BUILT = false as boolean
    const options = parseEngineOptions({
      itWasBuilt: ENGINE_WAS_BUILT,
      cwdAfterBuild: !ENGINE_WAS_BUILT ? '../dist/server' : '/home/dist/server',
      cwdBeforeBuild: !ENGINE_WAS_BUILT ? '/home/src' : '../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        scope: 'server',
        points: { root_ready: Point0.create('server').root() } as never,
        port: 3000,
        entry: './index.server.ts',
        outdir: '../dist/server',
        publicdirOutdir: '../dist/public',
      },
      clients: [
        {
          ssr: true,
          scope: 'client',
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
            "banner": null,
            "baseurl": "/",
            "bunBuildConfig": {},
            "bunPlugins": [],
            "domRootElementId": "root",
            "engineFile": null,
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "index": 0,
            "indexHtml": "/home/src/index.html",
            "outdir": "/home/dist/client",
            "points": "/home/src/lib/points.ready.js",
            "pointsModuleType": "lazy",
            "port": 3001,
            "prune": true,
            "pruneServer": true,
            "publicdir": [
              [
                "/",
                "/home/src/public",
              ],
            ],
            "publicdirOutdir": "/home/dist/client",
            "routes": null,
            "scope": "client",
            "serverOutdir": "/home/dist/clients-server/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "banner": null,
          "buildWatchGlob": [],
          "clientsSelfOutdir": null,
          "clientsServerOutdir": null,
          "cwd": "/home/src",
          "cwdAfterBuild": "/home/dist/server",
          "cwdBeforeBuild": "/home/src",
          "engineFile": null,
          "fallbackScope": "client",
          "itWasBuilt": false,
          "logger": {
            "error": [Function: error],
            "info": [Function: info],
          },
          "pointsGlob": [],
        },
        "server": {
          "banner": null,
          "bunBuildConfig": {},
          "bunPlugins": [],
          "cwdBeforeBuild": "/home/src",
          "engineFile": null,
          "entry": {
            "main": "/home/src/index.server.ts",
          },
          "fallbackScope": "client",
          "itWasBuilt": false,
          "outdir": "/home/dist/server",
          "pointsModuleType": "ready",
          "port": 3000,
          "publicdir": [],
          "publicdirOutdir": "/home/dist/public",
          "routes": null,
          "scope": "server",
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
        scope: 'server',
        points: { root_ready: Point0.create('server').root() } as never,
        port: 3000,
        entry: './index.server.ts',
        outdir: '../dist/server',
        publicdirOutdir: '../dist/public',
      },
      clients: [
        {
          ssr: true,
          scope: 'client',
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
            "banner": null,
            "baseurl": "/",
            "bunBuildConfig": {},
            "bunPlugins": [],
            "domRootElementId": "root",
            "engineFile": null,
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "hmrPort": 3101,
            "index": 0,
            "indexHtml": "/home/dist/client/index.html",
            "outdir": "/home/dist/client",
            "points": "/home/dist/clients-server/client/points.ready.js",
            "pointsModuleType": "lazy",
            "port": 3001,
            "prune": true,
            "pruneServer": true,
            "publicdir": [
              [
                "/",
                "/home/dist/client",
              ],
            ],
            "publicdirOutdir": "/home/dist/client",
            "routes": null,
            "scope": "client",
            "serverOutdir": "/home/dist/clients-server/client",
            "ssr": true,
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "banner": null,
          "buildWatchGlob": [],
          "clientsSelfOutdir": null,
          "clientsServerOutdir": null,
          "cwd": "/home/dist/server",
          "cwdAfterBuild": "/home/dist/server",
          "cwdBeforeBuild": "/home/src",
          "engineFile": null,
          "fallbackScope": "client",
          "itWasBuilt": true,
          "logger": {
            "error": [Function: error],
            "info": [Function: info],
          },
          "pointsGlob": [],
        },
        "server": {
          "banner": null,
          "bunBuildConfig": {},
          "bunPlugins": [],
          "cwdBeforeBuild": "/home/src",
          "engineFile": null,
          "entry": {
            "main": "/home/dist/server/index.server.js",
          },
          "fallbackScope": "client",
          "itWasBuilt": true,
          "outdir": "/home/dist/server",
          "pointsModuleType": "ready",
          "port": 3000,
          "publicdir": [],
          "publicdirOutdir": "/home/dist/public",
          "routes": null,
          "scope": "server",
        },
      }
    `)
  })
})

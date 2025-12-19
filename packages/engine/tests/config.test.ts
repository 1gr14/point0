import { describe, it, expect } from 'bun:test'
import { parseEngineOptions } from '../src/config.js'
import { omit } from 'lodash'
import { Point0 } from '@point0/core'

describe('parseEngineOptions', () => {
  it('should parse engine options', () => {
    const POINT0_ENGINE_WAS_BUILT = false as boolean
    const options = parseEngineOptions({
      itWasBuilt: POINT0_ENGINE_WAS_BUILT,
      cwdAfterBuild: !POINT0_ENGINE_WAS_BUILT ? '../dist/server' : '/home/dist/server',
      cwdBeforeBuild: !POINT0_ENGINE_WAS_BUILT ? '/home/src' : '../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        scope: 'server',
        points: { _root_ready: Point0.create('server').root() } as never,
        port: 3000,
        entry: './index.server.ts',
        outdir: '../dist/server',
        publicdirOutdir: '../dist/public',
      },
      clients: [
        {
          scope: 'client',
          points: { _root_ready: Point0.create('client').root() } as never,
          generatePointsReady: './lib/points.ready.js',
          indexHtml: './index.html',
          port: 3001,
          env: ['SOURCE_BASE_URL'],
          publicdir: './public',
          outdir: '../dist/client',
          publicdirOutdir: '../dist/client',
        },
      ],
    })
    expect(omit(options, ['server.pointsProvided', 'clients.0.pointsProvided'])).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "appProvided": null,
            "banner": null,
            "baseurl": "/",
            "bunBuildConfig": {},
            "bunPlugins": [],
            "domRootElementId": "root",
            "engineFile": null,
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "generatePointsLazy": null,
            "generatePointsReady": "./lib/points.ready.js",
            "hmrPort": 3101,
            "index": 0,
            "indexHtml": "/home/src/index.html",
            "outdir": "/home/dist/client",
            "port": 3001,
            "publicdir": [
              [
                "/",
                "/home/src/public",
              ],
            ],
            "publicdirOutdir": "/home/dist/client",
            "routesFile": null,
            "routesInstance": null,
            "scope": "client",
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "banner": null,
          "buildWatchGlob": [],
          "clientsOutdir": null,
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
          "generatePointsLazy": null,
          "generatePointsReady": null,
          "hmrPort": 3100,
          "itWasBuilt": false,
          "outdir": "/home/dist/server",
          "port": 3000,
          "publicdir": [],
          "publicdirOutdir": "/home/dist/public",
          "routesFile": null,
          "routesInstance": null,
          "scope": "server",
          "viteConfig": null,
        },
      }
    `)
  })

  it('should parse engine options when it was built', () => {
    const POINT0_ENGINE_WAS_BUILT = true as boolean
    const options = parseEngineOptions({
      itWasBuilt: POINT0_ENGINE_WAS_BUILT,
      cwdAfterBuild: !POINT0_ENGINE_WAS_BUILT ? '../dist/server' : '/home/dist/server',
      cwdBeforeBuild: !POINT0_ENGINE_WAS_BUILT ? '/home/src' : '../../src',
      // below all paths should be relative to cwdBeforeBuild like it was not built yet
      server: {
        scope: 'server',
        points: { _root_ready: Point0.create('server').root() } as never,
        port: 3000,
        entry: './index.server.ts',
        outdir: '../dist/server',
        publicdirOutdir: '../dist/public',
      },
      clients: [
        {
          scope: 'client',
          points: { _root_ready: Point0.create('client').root() } as never,
          generatePointsReady: './lib/points.ready.js',
          indexHtml: './index.html',
          port: 3001,
          env: ['SOURCE_BASE_URL'],
          publicdir: './public',
          outdir: '../dist/client',
          publicdirOutdir: '../dist/client',
        },
      ],
    })
    expect(omit(options, ['server.pointsProvided', 'clients.0.pointsProvided'])).toMatchInlineSnapshot(`
      {
        "clients": [
          {
            "appProvided": null,
            "banner": null,
            "baseurl": "/",
            "bunBuildConfig": {},
            "bunPlugins": [],
            "domRootElementId": "root",
            "engineFile": null,
            "env": {
              "SOURCE_BASE_URL": undefined,
            },
            "generatePointsLazy": null,
            "generatePointsReady": "./lib/points.ready.js",
            "hmrPort": 3101,
            "index": 0,
            "indexHtml": "/home/dist/client/index.html",
            "outdir": "/home/dist/client",
            "port": 3001,
            "publicdir": [
              [
                "/",
                "/home/dist/client",
              ],
            ],
            "publicdirOutdir": "/home/dist/client",
            "routesFile": null,
            "routesInstance": null,
            "scope": "client",
            "viteConfig": null,
          },
        ],
        "general": {
          "autoFixBuiltPaths": true,
          "banner": null,
          "buildWatchGlob": [],
          "clientsOutdir": null,
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
          "generatePointsLazy": null,
          "generatePointsReady": null,
          "hmrPort": 3100,
          "itWasBuilt": true,
          "outdir": "/home/dist/server",
          "port": 3000,
          "publicdir": [],
          "publicdirOutdir": "/home/dist/public",
          "routesFile": null,
          "routesInstance": null,
          "scope": "server",
          "viteConfig": null,
        },
      }
    `)
  })
})

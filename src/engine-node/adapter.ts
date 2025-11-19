import * as nodeFs from 'node:fs/promises'
import * as nodeFsSync from 'node:fs'
import * as nodePath from 'node:path'
import { Readable } from 'node:stream'
import fg from 'fast-glob'
import type { BuildOptions as EsbuildBuildOptions } from 'esbuild'
import type { RuntimeAdapter, FileHandle, GlobHandle } from '../engine-shared/adapters.js'
import type {
  EngineClientOptions,
  EngineServerOptions,
} from '../engine-shared/config.js'

// Esbuild config types - using actual esbuild types
export type EsbuildBuildConfigDefinitionFnOptions = {
  mode: string
  target: 'server' | 'client'
  command: 'serve' | 'build'
}
export type EsbuildBuildConfigDefinitionFn = (
  options: EsbuildBuildConfigDefinitionFnOptions,
) => Partial<EsbuildBuildOptions>
export type EsbuildBuildConfigDefinition = EsbuildBuildConfigDefinitionFn | Partial<EsbuildBuildOptions>

// Extended config types for Node engine
export type NodeEngineServerOptions = EngineServerOptions & {
  esbuildConfig?: EsbuildBuildConfigDefinition
}

export type NodeEngineClientOptions = EngineClientOptions & {
  esbuildConfig?: EsbuildBuildConfigDefinition
}

// Node runtime adapter implementation
export const nodeAdapter: RuntimeAdapter = {
  file: Object.assign(
    (path: string): FileHandle => {
      return {
        exists: async () => {
          try {
            await nodeFs.access(path)
            return true
          } catch {
            return false
          }
        },
        text: async () => {
          return await nodeFs.readFile(path, 'utf-8')
        },
        arrayBuffer: async () => {
          const buffer = await nodeFs.readFile(path)
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
        },
        stream: () => {
          const stream = nodeFsSync.createReadStream(path)
          return Readable.toWeb(stream) as ReadableStream<Uint8Array>
        },
      }
    },
    {
      exists: async (path: string) => {
        try {
          await nodeFs.access(path)
          return true
        } catch {
          return false
        }
      },
      text: async (path: string) => {
        return await nodeFs.readFile(path, 'utf-8')
      },
    },
  ),
  glob: (pattern: string): GlobHandle => {
    return {
      async *scan(options: { cwd: string; onlyFiles: boolean }) {
        const files = await fg(pattern, {
          cwd: options.cwd,
          onlyFiles: options.onlyFiles,
          absolute: false,
        })
        for (const file of files) {
          yield file
        }
      },
    }
  },
  write: async (path: string, content: string | Uint8Array) => {
    await nodeFs.mkdir(nodePath.dirname(path), { recursive: true })
    await nodeFs.writeFile(path, content)
  },
}


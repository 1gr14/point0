export interface FileHandle {
  exists(): Promise<boolean>
  text(): Promise<string>
  arrayBuffer(): Promise<ArrayBuffer>
  stream(): ReadableStream<Uint8Array>
}

export interface GlobHandle {
  scan(options: { cwd: string; onlyFiles: boolean }): AsyncIterable<string>
}

/**
 * Runtime adapter for file system operations.
 * Build and serve operations are handled separately as they have very different
 * signatures between Bun and Node.js runtimes.
 */
export interface RuntimeAdapter {
  file: {
    (path: string): FileHandle
    exists(path: string): Promise<boolean>
    text(path: string): Promise<string>
  }
  glob: (pattern: string) => GlobHandle
  write: (path: string, content: string | Uint8Array) => Promise<void>
}


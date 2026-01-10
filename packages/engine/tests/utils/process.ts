import { throwOnHelperLogFnCalling } from './other.js'
import type { ChildProcess } from 'node:child_process'
import { execaNode, type Options } from 'execa'

export type TestProcessOutput = {
  stdout: string
  stderr: string
}

/**
 * Base class for test processes
 * Provides common functionality for output collection and process management
 */
export abstract class TestProcess {
  protected readonly stdoutChunks: Uint8Array[] = []
  protected readonly stderrChunks: Uint8Array[] = []
  protected readonly allChunks: Uint8Array[] = []

  /**
   * Spawn a new process using Bun and wrap it in a TestProcessBun
   * Automatically pipes stdout and stderr for output collection
   */
  static spawn(cmds: string[], options?: Parameters<typeof Bun.spawn>[1]): TestProcessBun {
    const child = Bun.spawn(cmds, {
      stdout: 'pipe' as never,
      stderr: 'pipe' as never,
      ...options,
    })
    return new TestProcessBun(child)
  }

  /**
   * Spawn a new process using execa and wrap it in a TestProcessExeca
   * Automatically pipes stdout and stderr for output collection
   */
  static spawnExeca(cmds: string[], options?: Options): TestProcessExeca {
    const [command, ...args] = cmds
    const child = execaNode(command, args, {
      ...options,
      stdout: 'pipe',
      stderr: 'pipe',
    })
    return new TestProcessExeca(child)
  }

  /**
   * Get stdout output as string
   */
  get stdout(): string {
    return new TextDecoder().decode(Buffer.concat(this.stdoutChunks))
  }

  /**
   * Get stderr output as string
   */
  get stderr(): string {
    return new TextDecoder().decode(Buffer.concat(this.stderrChunks))
  }

  /**
   * Get combined stdout and stderr output as string
   */
  get output(): string {
    return new TextDecoder().decode(Buffer.concat(this.allChunks))
  }

  /**
   * Log output to console
   */
  logOutput(): void {
    throwOnHelperLogFnCalling()
    console.info(this.output)
  }

  /**
   * Check if output contains specified text(s)
   */
  hasOutput(text: string | string[]): boolean {
    const texts = Array.isArray(text) ? text : [text]
    for (const text of texts) {
      if (this.output.includes(text)) {
        return true
      }
    }
    return false
  }

  /**
   * Wait for output to contain specified text(s)
   */
  async waitOutput(text: string | string[], timeout = 5000): Promise<string> {
    const startTime = Date.now()
    const texts = Array.isArray(text) ? text : [text]
    while (true) {
      const output = this.output
      const result = TestProcess.isOutputMatchesMany(output, texts)
      if (result.ok) {
        return result.ok
      }
      if (result.bad) {
        console.error(this.output)
        throw new Error(`Output does match negative pattern: ${result.bad}`)
      }
      if (Date.now() - startTime > timeout) {
        console.error(this.output)
        throw new Error(`Timeout waiting for output: ${texts.join(', ')} within ${timeout}ms`)
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  /**
   * Get the process exit code
   * Must be implemented by subclass
   */
  abstract get exited(): Promise<number>

  /**
   * Get the process ID
   * Must be implemented by subclass
   */
  abstract get pid(): number | undefined

  /**
   * Kill the process
   * Must be implemented by subclass
   */
  abstract kill(signal?: number | NodeJS.Signals, force?: boolean): void

  private static isOutputMatchesMany(
    output: string,
    text: string | string[],
  ): { ok: false | string; bad: false | string } {
    const texts = Array.isArray(text) ? text : [text]
    for (const text of texts) {
      if (text.startsWith('!')) {
        if (output.includes(text.slice(1))) {
          return { ok: false, bad: text }
        }
      } else {
        if (output.includes(text)) {
          return { ok: text, bad: false }
        }
      }
    }
    return { ok: false, bad: false }
  }
}

/**
 * TestProcess implementation for Bun.Subprocess
 */
export class TestProcessBun extends TestProcess {
  readonly process: Bun.Subprocess

  constructor(child: Bun.Subprocess) {
    super()
    this.process = child
    this.setupOutputCollection()
  }

  private setupOutputCollection(): void {
    if (this.process.stdout && typeof this.process.stdout !== 'number') {
      void this.process.stdout.pipeTo(
        new WritableStream({
          write: (chunk) => {
            this.stdoutChunks.push(chunk)
            this.allChunks.push(chunk)
          },
        }),
      )
    }

    if (this.process.stderr && typeof this.process.stderr !== 'number') {
      void this.process.stderr.pipeTo(
        new WritableStream({
          write: (chunk) => {
            this.stderrChunks.push(chunk)
            this.allChunks.push(chunk)
          },
        }),
      )
    }
  }

  override get exited(): Promise<number> {
    return this.process.exited
  }

  override get pid(): number | undefined {
    return this.process.pid
  }

  override kill(signal: number | NodeJS.Signals = 'SIGKILL', force = true): void {
    if (force) {
      try {
        this.process.kill(signal)
      } catch (error) {}
    } else {
      this.process.kill(signal)
    }
  }
}

/**
 * TestProcess implementation for execa (Node.js ChildProcess)
 */
export class TestProcessExeca extends TestProcess {
  readonly process: ChildProcess
  private _exited: Promise<number> | null = null

  constructor(child: ChildProcess) {
    super()
    this.process = child
    this.setupOutputCollection()
  }

  private setupOutputCollection(): void {
    if (this.process.stdout) {
      this.process.stdout.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf-8')
        this.stdoutChunks.push(buffer)
        this.allChunks.push(buffer)
      })
    }

    if (this.process.stderr) {
      this.process.stderr.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf-8')
        this.stderrChunks.push(buffer)
        this.allChunks.push(buffer)
      })
    }
  }

  override get exited(): Promise<number> {
    if (this._exited) {
      return this._exited
    }
    this._exited = new Promise<number>((resolve) => {
      this.process.on('exit', (code) => {
        resolve(code ?? 0)
      })
    })
    return this._exited
  }

  override get pid(): number | undefined {
    return this.process.pid ?? undefined
  }

  override kill(signal: number | NodeJS.Signals = 'SIGKILL', force = true): void {
    if (force) {
      try {
        this.process.kill(signal)
      } catch (error) {}
    } else {
      this.process.kill(signal)
    }
  }
}

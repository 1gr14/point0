// eslint-disable-next-line @typescript-eslint/no-require-imports
const killPort = require('kill-port') as (port: number, protocol?: 'tcp' | 'udp') => Promise<unknown>

export type TestProcessOutput = {
  stdout: string
  stderr: string
}

export class TestProcess {
  readonly process: Bun.Subprocess
  readonly ports: number[]
  private readonly stdoutChunks: Uint8Array[] = []
  private readonly stderrChunks: Uint8Array[] = []

  private constructor({ child, ports }: { child: Bun.Subprocess; ports: number[] }) {
    this.process = child
    this.setupOutputCollection()
    this.ports = ports
  }

  /**
   * Spawn a new process and wrap it in a TestProcess
   * Automatically pipes stdout and stderr for output collection
   */
  static async spawn(cmds: string[], options?: Parameters<typeof Bun.spawn>[1]): Promise<TestProcess>
  static async spawn(cmds: string[], ports: number[], options?: Parameters<typeof Bun.spawn>[1]): Promise<TestProcess>
  static async spawn(
    ...args:
      | [cmds: string[], options?: Parameters<typeof Bun.spawn>[1]]
      | [cmds: string[], ports: number[], options?: Parameters<typeof Bun.spawn>[1]]
  ): Promise<TestProcess> {
    const [cmds, ports = [], options = {}] = (() => {
      if (Array.isArray(args[1])) {
        return [args[0], args[1], args[2]]
      }
      return [args[0], [], args[1]]
    })()
    await TestProcess.killPorts(ports)
    const child = Bun.spawn(cmds, {
      stdout: 'pipe' as never,
      stderr: 'pipe' as never,
      ...options,
    })
    return new TestProcess({ child, ports })
  }

  private setupOutputCollection() {
    if (this.process.stdout && typeof this.process.stdout !== 'number') {
      void this.process.stdout.pipeTo(
        new WritableStream({
          write: (chunk) => {
            this.stdoutChunks.push(chunk)
          },
        }),
      )
    }

    if (this.process.stderr && typeof this.process.stderr !== 'number') {
      void this.process.stderr.pipeTo(
        new WritableStream({
          write: (chunk) => {
            this.stderrChunks.push(chunk)
          },
        }),
      )
    }
  }

  /**
   * Wait for the process to exit and return the exit code
   */
  get exited(): Promise<number> {
    return this.process.exited
  }

  /**
   * Get the process ID
   */
  get pid(): number | undefined {
    return this.process.pid
  }

  /**
   * Kill the process
   */
  killSelf(signal?: number | NodeJS.Signals): void {
    this.process.kill(signal)
  }

  static async killPorts(ports: number[]): Promise<void> {
    await Promise.all(
      ports.map(async (port) => {
        try {
          await killPort(port)
        } catch {
          // Ignore errors - port might not be in use
        }
      }),
    )
  }

  async killPorts(): Promise<void> {
    await TestProcess.killPorts(this.ports)
  }

  /**
   * Kill the current process and processes on tracked ports
   */
  async kill(signal: number | NodeJS.Signals = 'SIGKILL'): Promise<void> {
    try {
      this.killSelf(signal)
    } catch {
      // Ignore errors - process might have already exited
    }
    try {
      await this.killPorts()
    } catch {
      // Ignore errors - ports might not be in use
    }
  }

  /**
   * Get collected stdout output (current output, doesn't wait for process to exit)
   */
  get stdout(): string {
    return new TextDecoder().decode(Buffer.concat(this.stdoutChunks))
  }

  /**
   * Get collected stderr output (current output, doesn't wait for process to exit)
   */
  get stderr(): string {
    return new TextDecoder().decode(Buffer.concat(this.stderrChunks))
  }

  /**
   * Get both stdout and stderr output (current output, doesn't wait for process to exit)
   */
  get output(): TestProcessOutput {
    return {
      stdout: this.stdout,
      stderr: this.stderr,
    }
  }
}

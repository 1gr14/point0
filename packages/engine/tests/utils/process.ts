export type TestProcessOutput = {
  stdout: string
  stderr: string
}

export class TestProcess {
  readonly process: Bun.Subprocess
  private readonly stdoutChunks: Uint8Array[] = []
  private readonly stderrChunks: Uint8Array[] = []
  private readonly allChunks: Uint8Array[] = []

  private constructor({ child }: { child: Bun.Subprocess }) {
    this.process = child
    this.setupOutputCollection()
  }

  /**
   * Spawn a new process and wrap it in a TestProcess
   * Automatically pipes stdout and stderr for output collection
   */
  static spawn(cmds: string[], options?: Parameters<typeof Bun.spawn>[1]): TestProcess {
    const child = Bun.spawn(cmds, {
      stdout: 'pipe' as never,
      stderr: 'pipe' as never,
      ...options,
    })
    const testProcess = new TestProcess({ child })
    return testProcess
  }

  private setupOutputCollection() {
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
  kill(signal: number | NodeJS.Signals = 'SIGKILL', force = true): void {
    if (force) {
      try {
        this.process.kill(signal)
      } catch (error) {}
    } else {
      this.process.kill(signal)
    }
  }

  get stdout(): string {
    return new TextDecoder().decode(Buffer.concat(this.stdoutChunks))
  }

  get stderr(): string {
    return new TextDecoder().decode(Buffer.concat(this.stderrChunks))
  }

  get output(): string {
    return new TextDecoder().decode(Buffer.concat(this.allChunks))
  }

  logOutput() {
    const lines = this.output.split('\n')
    for (const line of lines) {
      console.info(line)
    }
  }
}

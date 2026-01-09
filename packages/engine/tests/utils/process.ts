export type TestProcessOutput = {
  stdout: string
  stderr: string
}

export class TestProcess {
  readonly process: Bun.Subprocess
  private readonly stdoutChunks: Uint8Array[] = []
  private readonly stderrChunks: Uint8Array[] = []

  private constructor(child: Bun.Subprocess) {
    this.process = child
    this.setupOutputCollection()
  }

  static create(child: Bun.Subprocess): TestProcess {
    return new TestProcess(child)
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
  kill(signal?: number | NodeJS.Signals): void {
    this.process.kill(signal)
  }

  /**
   * Kill the process and all its children (process tree)
   * This ensures child processes spawned by the dev server are also terminated
   */
  async killTree(signal: number | NodeJS.Signals = 'SIGKILL'): Promise<void> {
    const pid = this.process.pid
    if (!pid) {
      // Process already exited or no PID available
      return
    }

    if (process.platform === 'win32') {
      // On Windows, just kill the process itself
      // Windows handles child process cleanup differently
      try {
        this.process.kill(signal)
      } catch {
        // Ignore errors if process already exited
      }
      return
    }

    // On Unix systems, recursively find and kill all child processes
    const killChildren = async (parentPid: number): Promise<void> => {
      try {
        // Find all direct children of this process
        const pgrepProcess = Bun.spawn({
          cmd: ['pgrep', '-P', parentPid.toString()],
          stdout: 'pipe',
          stderr: 'pipe',
        })

        const output = await new Response(pgrepProcess.stdout).text()
        const childPids = output
          .trim()
          .split('\n')
          .filter((line) => line.trim())
          .map((line) => parseInt(line.trim(), 10))
          .filter((p) => !isNaN(p))

        // Recursively kill children first
        await Promise.all(
          childPids.map(async (childPid) => {
            await killChildren(childPid)
            try {
              const killProcess = Bun.spawn({
                cmd: ['kill', `-${signal}`, childPid.toString()],
                stdout: 'pipe',
                stderr: 'pipe',
              })
              await killProcess.exited
            } catch {
              // Ignore errors if process already exited
            }
          }),
        )
      } catch {
        // Ignore errors (process might have no children or already exited)
      }
    }

    try {
      // First, try to kill the process group (if it exists)
      // Negative PID kills the process group
      try {
        const killGroupProcess = Bun.spawn({
          cmd: ['kill', `-${signal}`, `-${pid}`],
          stdout: 'pipe',
          stderr: 'pipe',
        })
        await killGroupProcess.exited
      } catch {
        // Process group might not exist, continue with individual killing
      }

      // Kill all children recursively
      await killChildren(pid)

      // Finally, kill the parent process itself
      try {
        this.process.kill(signal)
      } catch {
        // Ignore errors if process already exited
      }
    } catch (error) {
      // Fallback: just kill the process directly
      try {
        this.process.kill(signal)
      } catch {
        // Ignore errors if process already exited
      }
    }

    // Wait a bit for the process to fully exit
    try {
      await Promise.race([
        this.process.exited,
        new Promise((resolve) => setTimeout(resolve, 1000)), // Max 1 second wait
      ])
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get collected stdout output (waits for process to exit)
   */
  async getStdout(): Promise<string> {
    await this.process.exited
    return new TextDecoder().decode(Buffer.concat(this.stdoutChunks))
  }

  /**
   * Get collected stderr output (waits for process to exit)
   */
  async getStderr(): Promise<string> {
    await this.process.exited
    return new TextDecoder().decode(Buffer.concat(this.stderrChunks))
  }

  /**
   * Get both stdout and stderr output (waits for process to exit)
   */
  async getOutput(): Promise<TestProcessOutput> {
    await this.process.exited
    return {
      stdout: new TextDecoder().decode(Buffer.concat(this.stdoutChunks)),
      stderr: new TextDecoder().decode(Buffer.concat(this.stderrChunks)),
    }
  }
}

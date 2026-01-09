/**
 * Fast, direct port killing using native OS commands
 * Much faster than kill-port package which scans all processes
 * Excludes current process and parent processes to avoid killing test runner
 */
async function killPortFast(port: number, excludePids: Set<number> = new Set<number>()): Promise<void> {
  // Always exclude current process and parent to protect test runner
  const currentPid = process.pid
  const parentPid = process.ppid
  excludePids.add(currentPid)
  if (parentPid) excludePids.add(parentPid)

  if (process.platform === 'win32') {
    // Windows: Use netstat to find PID, then TaskKill
    const proc = Bun.spawn(['netstat', '-ano'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const stdout = await new Response(proc.stdout).text()
    await proc.exited.catch(() => {
      // Ignore errors
    })

    const pids = new Set<string>()
    const lines = stdout.split('\n')
    const pidRegex = /\s+(\d+)\s*$/
    for (const line of lines) {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const match = pidRegex.exec(line)
        if (match) {
          const pid = parseInt(match[1], 10)
          // Exclude test runner and parent processes
          if (!excludePids.has(pid)) {
            pids.add(match[1])
          }
        }
      }
    }

    if (pids.size > 0) {
      await Bun.spawn(['TaskKill', '/F', '/PID', ...Array.from(pids)], {
        stdout: 'pipe',
        stderr: 'pipe',
      }).exited.catch(() => {
        // Ignore errors - process might have already exited
      })
    }
  } else {
    // Unix: Use lsof -ti to get PIDs directly, then kill -9
    // This is much faster than kill-port's approach (avoids scanning all processes)
    try {
      const proc = Bun.spawn(['lsof', '-ti', `tcp:${port}`], {
        stdout: 'pipe',
        stderr: 'pipe',
      })
      const output = await new Response(proc.stdout).text()
      await proc.exited.catch(() => {
        // Ignore errors - lsof exits with code 1 if no process found
      })

      const allPids = output.trim().split('\n').filter(Boolean)
      // Filter out excluded PIDs (test runner, parent processes)
      const pids = allPids.filter((pidStr) => {
        const pid = parseInt(pidStr, 10)
        return !excludePids.has(pid)
      })

      if (pids.length > 0) {
        // Kill all PIDs at once with SIGKILL (hardest kill, -9)
        // But only if they're not excluded (test runner, etc.)
        await Bun.spawn(['kill', '-9', ...pids], {
          stdout: 'pipe',
          stderr: 'pipe',
        }).exited.catch(() => {
          // Ignore errors - process might have already exited
        })
      }
    } catch {
      // Port might not be in use, ignore
    }
  }
}

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

  static async killPorts(ports: number[], excludePids?: Set<number>): Promise<void> {
    // Kill all ports in parallel with timeout to prevent hanging
    await Promise.allSettled(
      ports.map(async (port) => {
        try {
          // Add timeout to prevent hanging (500ms max per port)
          await Promise.race([
            killPortFast(port, excludePids),
            new Promise<void>((resolve) => setTimeout(resolve, 500)),
          ])
        } catch {
          // Ignore errors - port might not be in use
        }
      }),
    )
  }

  async killPorts(): Promise<void> {
    // Exclude this process's PID to avoid killing ourselves
    const excludePids = new Set<number>()
    if (this.process.pid) {
      excludePids.add(this.process.pid)
    }
    await TestProcess.killPorts(this.ports, excludePids)
  }

  /**
   * Kill the current process and processes on tracked ports
   * Uses SIGKILL (hardest kill) by default for immediate termination
   */
  async kill(signal: number | NodeJS.Signals = 'SIGKILL'): Promise<void> {
    // Kill ports first (in parallel, non-blocking) then kill the process
    // This ensures ports are freed even if process kill fails
    const portKillPromise = this.killPorts().catch(() => {
      // Ignore errors - ports might not be in use
    })

    // Kill the process immediately with SIGKILL (hardest kill)
    try {
      this.killSelf(signal)
    } catch {
      // Ignore errors - process might have already exited
    }

    // Wait for port killing but don't block too long
    await Promise.race([portKillPromise, new Promise<void>((resolve) => setTimeout(resolve, 1000))])
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

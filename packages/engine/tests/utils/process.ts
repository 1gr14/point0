import { throwOnHelperLogFnCalling } from './other.js'

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
      } catch {}
    } else {
      this.process.kill(signal)
    }
  }

  /**
   * Kill the process and its descendants in a cross-platform way.
   */
  async killTree(force = true): Promise<void> {
    const pid = this.pid
    if (!pid) return

    if (process.platform === 'win32') {
      const result = await Bun.$`taskkill /pid ${pid} /T /F`.nothrow().quiet()
      if (!force && result.exitCode !== 0) {
        throw new Error(`Failed to taskkill process tree pid=${pid}`)
      }
      await this.waitExited(2000)
      return
    }

    const descendants = await TestProcess.getDescendantPids(pid)
    const pidsToKill = [...descendants, pid].reverse()
    for (const childPid of pidsToKill) {
      const result = await Bun.$`kill -9 ${childPid}`.nothrow().quiet()
      if (!force && result.exitCode !== 0) {
        throw new Error(`Failed to kill pid=${childPid}`)
      }
    }
    await this.waitExited(2000)
  }

  private async waitExited(timeoutMs: number): Promise<void> {
    await Promise.race([
      this.exited.then(() => undefined).catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ])
  }

  private static async getDescendantPids(rootPid: number): Promise<number[]> {
    if (process.platform === 'win32') {
      return []
    }
    const collected = new Set<number>()
    const queue: number[] = [rootPid]
    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue
      const result = await Bun.$`pgrep -P ${current}`.nothrow().quiet()
      if (result.exitCode !== 0) {
        continue
      }
      const children = result
        .text()
        .trim()
        .split(/[\n\r]/)
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0)
      for (const child of children) {
        if (collected.has(child)) continue
        collected.add(child)
        queue.push(child)
      }
    }
    return [...collected]
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

  logOutput(): void {
    throwOnHelperLogFnCalling()
    console.info(this.output)
  }

  hasOutput(text: string | string[]): boolean {
    const texts = Array.isArray(text) ? text : [text]
    for (const text of texts) {
      if (this.output.includes(text)) {
        return true
      }
    }
    return false
  }

  async waitOutput(text: string | string[], timeout = 5000): Promise<string> {
    const startTime = Date.now()
    const texts = Array.isArray(text) ? text : [text]

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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

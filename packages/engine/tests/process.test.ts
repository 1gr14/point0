import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test'
import { TestProcess, TestProcessBun, TestProcessExeca } from './utils/process.js'

setDefaultTimeout(10000)

describe('TestProcess', () => {
  const processes: TestProcess[] = []

  afterEach(() => {
    // Clean up all spawned processes
    for (const process of processes) {
      try {
        process.kill()
      } catch (error) {
        // Ignore errors when killing already dead processes
      }
    }
    processes.length = 0
  })

  describe('TestProcessBun', () => {
    it('should spawn a Bun process and collect stdout', async () => {
      const proc = TestProcess.spawn(['echo', 'hello world'])
      processes.push(proc)

      expect(proc).toBeInstanceOf(TestProcessBun)
      expect(proc.pid).toBeNumber()
      expect(proc.pid).toBeGreaterThan(0)

      await proc.exited
      expect(proc.stdout.trim()).toBe('hello world')
      expect(proc.stderr).toBe('')
    })

    it('should spawn a Bun process and collect stderr', async () => {
      // Use a command that outputs to stderr
      const proc = TestProcess.spawn(['sh', '-c', 'echo "error message" >&2'])
      processes.push(proc)

      await proc.exited
      expect(proc.stderr.trim()).toContain('error message')
    })

    it('should collect combined stdout and stderr in output', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'echo "stdout"; echo "stderr" >&2'])
      processes.push(proc)

      await proc.exited
      const output = proc.output
      expect(output).toContain('stdout')
      expect(output).toContain('stderr')
    })

    it('should get process ID', () => {
      const proc = TestProcess.spawn(['sleep', '1'])
      processes.push(proc)

      expect(proc.pid).toBeNumber()
      expect(proc.pid).toBeGreaterThan(0)
      proc.kill()
    })

    it('should kill a running process', async () => {
      const proc = TestProcess.spawn(['sleep', '10'])
      processes.push(proc)

      const pid = proc.pid
      expect(pid).toBeNumber()

      proc.kill()
      const exitCode = await proc.exited
      expect(exitCode).not.toBe(0)
    })

    it('should wait for output with waitOutput', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'sleep 0.1 && echo "ready"'])
      processes.push(proc)

      const matched = await proc.waitOutput('ready', 2000)
      expect(matched).toBe('ready')
      expect(proc.hasOutput('ready')).toBe(true)
    })

    it('should wait for output with multiple patterns', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'sleep 0.1 && echo "pattern1"'])
      processes.push(proc)

      const matched = await proc.waitOutput(['pattern1', 'pattern2'], 2000)
      expect(matched).toBe('pattern1')
    })

    it('should timeout when waiting for output that never appears', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'echo "other text"'])
      processes.push(proc)

      // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
      await expect(proc.waitOutput('never appears', 500)).rejects.toThrow('Timeout')
    })

    it('should detect negative patterns in waitOutput', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'echo "error occurred"'])
      processes.push(proc)

      // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
      await expect(proc.waitOutput(['!error occurred', 'success'], 1000)).rejects.toThrow('negative pattern')
    })

    it('should check if output contains text with hasOutput', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'echo "test message"'])
      processes.push(proc)

      await proc.exited
      expect(proc.hasOutput('test message')).toBe(true)
      expect(proc.hasOutput('nonexistent')).toBe(false)
      expect(proc.hasOutput(['test message', 'other'])).toBe(true)
      expect(proc.hasOutput(['nonexistent1', 'nonexistent2'])).toBe(false)
    })

    it('should handle process exit code', async () => {
      const proc1 = TestProcess.spawn(['sh', '-c', 'exit 0'])
      processes.push(proc1)
      expect(await proc1.exited).toBe(0)

      const proc2 = TestProcess.spawn(['sh', '-c', 'exit 42'])
      processes.push(proc2)
      expect(await proc2.exited).toBe(42)
    })

    it('should handle custom cwd option', async () => {
      const proc = TestProcess.spawn(['pwd'], {
        cwd: '/tmp',
      })
      processes.push(proc)

      await proc.exited
      expect(proc.stdout.trim()).toContain('/tmp')
    })
  })

  describe('TestProcessExeca', () => {
    it('should spawn an execa process and collect stdout', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo "hello world"'])
      processes.push(proc)

      expect(proc).toBeInstanceOf(TestProcessExeca)
      expect(proc.pid).toBeNumber()
      expect(proc.pid).toBeGreaterThan(0)

      await proc.exited
      expect(proc.stdout.trim()).toBe('hello world')
      expect(proc.stderr).toBe('')
    })

    it('should spawn an execa process and collect stderr', async () => {
      // Use a command that outputs to stderr
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo "error message" >&2'])
      processes.push(proc)

      await proc.exited
      expect(proc.stderr.trim()).toContain('error message')
    })

    it('should collect combined stdout and stderr in output', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo "stdout"; echo "stderr" >&2'])
      processes.push(proc)

      await proc.exited
      const output = proc.output
      expect(output).toContain('stdout')
      expect(output).toContain('stderr')
    })

    it('should get process ID', () => {
      const proc = TestProcess.spawnExeca(['sleep', '1'])
      processes.push(proc)

      expect(proc.pid).toBeNumber()
      expect(proc.pid).toBeGreaterThan(0)
      proc.kill()
    })

    it('should kill a running process', async () => {
      const proc = TestProcess.spawnExeca(['sleep', '10'])
      processes.push(proc)

      const pid = proc.pid
      expect(pid).toBeNumber()

      proc.kill()
      const exitCode = await proc.exited
      expect(exitCode).not.toBe(0)
    })

    it('should wait for output with waitOutput', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'sleep 0.1 && echo "ready"'])
      processes.push(proc)

      const matched = await proc.waitOutput('ready', 2000)
      expect(matched).toBe('ready')
      expect(proc.hasOutput('ready')).toBe(true)
    })

    it('should wait for output with multiple patterns', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'sleep 0.1 && echo "pattern1"'])
      processes.push(proc)

      const matched = await proc.waitOutput(['pattern1', 'pattern2'], 2000)
      expect(matched).toBe('pattern1')
    })

    it('should timeout when waiting for output that never appears', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo "other text"'])
      processes.push(proc)

      // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
      await expect(proc.waitOutput('never appears', 500)).rejects.toThrow('Timeout')
    })

    it('should detect negative patterns in waitOutput', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo "error occurred"'])
      processes.push(proc)

      // eslint-disable-next-line @typescript-eslint/await-thenable, @typescript-eslint/no-confusing-void-expression
      await expect(proc.waitOutput(['!error occurred', 'success'], 1000)).rejects.toThrow('negative pattern')
    })

    it('should check if output contains text with hasOutput', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo "test message"'])
      processes.push(proc)

      await proc.exited
      expect(proc.hasOutput('test message')).toBe(true)
      expect(proc.hasOutput('nonexistent')).toBe(false)
      expect(proc.hasOutput(['test message', 'other'])).toBe(true)
      expect(proc.hasOutput(['nonexistent1', 'nonexistent2'])).toBe(false)
    })

    it('should handle process exit code', async () => {
      const proc1 = TestProcess.spawnExeca(['sh', '-c', 'exit 0'])
      processes.push(proc1)
      expect(await proc1.exited).toBe(0)

      const proc2 = TestProcess.spawnExeca(['sh', '-c', 'exit 42'])
      processes.push(proc2)
      expect(await proc2.exited).toBe(42)
    })

    it('should handle custom cwd option', async () => {
      const proc = TestProcess.spawnExeca(['pwd'], {
        cwd: '/tmp',
      })
      processes.push(proc)

      await proc.exited
      expect(proc.stdout.trim()).toContain('/tmp')
    })

    it('should handle environment variables', async () => {
      const proc = TestProcess.spawnExeca(['sh', '-c', 'echo $TEST_VAR'], {
        env: { TEST_VAR: 'test-value' },
      })
      processes.push(proc)

      await proc.exited
      expect(proc.stdout.trim()).toBe('test-value')
    })
  })

  describe('Common functionality', () => {
    it('should have same behavior for both implementations', async () => {
      const bunProc = TestProcess.spawn(['echo', 'test'])
      const execaProc = TestProcess.spawnExeca(['echo', 'test'])
      processes.push(bunProc, execaProc)

      await Promise.all([bunProc.exited, execaProc.exited])

      expect(bunProc.stdout.trim()).toBe('test')
      expect(execaProc.stdout.trim()).toBe('test')
      expect(bunProc.hasOutput('test')).toBe(true)
      expect(execaProc.hasOutput('test')).toBe(true)
    })

    it('should handle incremental output collection', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'echo "line1"; sleep 0.1; echo "line2"'])
      processes.push(proc)

      // Wait for first line
      await proc.waitOutput('line1', 2000)
      expect(proc.hasOutput('line1')).toBe(true)

      // Wait for second line
      await proc.waitOutput('line2', 2000)
      expect(proc.hasOutput('line2')).toBe(true)
      expect(proc.output).toContain('line1')
      expect(proc.output).toContain('line2')
    })

    it('should separate stdout and stderr correctly', async () => {
      const proc = TestProcess.spawn(['sh', '-c', 'echo "stdout text"; echo "stderr text" >&2'])
      processes.push(proc)

      await proc.exited
      expect(proc.stdout).toContain('stdout text')
      expect(proc.stdout).not.toContain('stderr text')
      expect(proc.stderr).toContain('stderr text')
      expect(proc.stderr).not.toContain('stdout text')
      expect(proc.output).toContain('stdout text')
      expect(proc.output).toContain('stderr text')
    })
  })
})

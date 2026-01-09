import { afterAll, describe, it } from 'bun:test'
import type { TestProject } from './utils/project.js'
import { TestProjectFactory } from './utils/project.js'

const tpf = TestProjectFactory.create({
  namespace: 'dev',
})

let preventFinalCleanup = false
const wrp = (callback: ({ tp }: { tp: TestProject }) => any, deleteFiles = true) => {
  if (!deleteFiles) {
    preventFinalCleanup = true
  }
  return async () => {
    let tp: TestProject | undefined
    const cleanup = async () => {
      if (!deleteFiles && tp) {
        await tp.cleanup()
      }
    }
    try {
      tp = await tpf.init()
      await callback({ tp })
      await cleanup()
    } catch (error) {
      await cleanup()
      throw error
    }
  }
}

describe('dev', () => {
  afterAll(async () => {
    console.log('preventFinalCleanup', preventFinalCleanup)
    if (!preventFinalCleanup) {
      await tpf.cleanup()
    }
  })

  it.concurrent(
    'start dev server',
    wrp(async ({ tp }) => {
      // TODO: using $ bun run dev and check if server is started
      // and collect output to
      const process = tp.spawn(['bun', 'run', 'dev'])
      // console.log('process', process)

      // Wait a bit for the server to start (or fail)
      // Dev servers run indefinitely, so we'll wait a short time then kill it
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Kill the process tree (including all child processes)
      await process.killTree('SIGKILL')

      // Wait for the process to exit
      await process.exited
      const output = await process.getOutput()
      console.log('output:', output)
      // console.log('stdout:', output.stdout)
      // console.log('stderr:', output.stderr)

      // Exit code might be non-zero if we killed it, but that's expected
      // The important thing is that all processes are cleaned up
    }),
  )
})

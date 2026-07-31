import { prisma } from '@/lib/prisma'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// A slow SERVER COMPONENT — a plain async function. Its code never ships; only the host elements it
// renders do. It lives in its own file so the client compile of the page keeps only the import (the
// page references it inside a server-only loader), and this module — prisma and all — never enters
// the client graph.
export const SlowServerBlock = async () => {
  await sleep(1500)
  const ideasCount = await prisma.idea.count()
  return (
    <p className="rounded-lg bg-sky-50 px-4 py-3 text-sky-800">
      Rendered on the server from <b>{ideasCount}</b> ideas — this markup streamed in via <code>defer()</code>.
    </p>
  )
}

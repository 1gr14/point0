import * as http from 'node:http'
import { parseUrl } from '../core/utils.js'
import type { RequiredCtx } from '../core/types.js'
import type { ServerBun } from '../engine-shared/server.js'

export async function serveServerViaNode({
  server,
  requiredCtx,
}: {
  server: ServerBun<true>
  requiredCtx: RequiredCtx
}): Promise<http.Server> {
  const httpServer = http.createServer((nodeReq, nodeRes) => {
    void (async () => {
      // Convert Node.js request to Web API Request
      const url = `http://${nodeReq.headers.host}${nodeReq.url}`
      const body = nodeReq.method !== 'GET' && nodeReq.method !== 'HEAD' ? await streamToArrayBuffer(nodeReq) : null

      const headers = new Headers()
      for (const [key, value] of Object.entries(nodeReq.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v)
            }
          } else {
            headers.set(key, value)
          }
        }
      }

      const request = new Request(url, {
        method: nodeReq.method,
        headers,
        body: body ? new Uint8Array(body) : null,
      })

      const parsedUrl = parseUrl(request.url)

      // Handle dev server middleware (Vite, etc.)
      if (process.env.NODE_ENV !== 'production') {
        for (const client of server.clients) {
          const viteDevServerResponse = await client.fetchViteDevServerMiddleware(request, parsedUrl)
          if (viteDevServerResponse) {
            await writeResponseToNodeRes(viteDevServerResponse, nodeRes)
            return
          }
        }
      }

      const response = await server.fetch({ parsedUrl, request, requiredCtx })
      await writeResponseToNodeRes(response, nodeRes)
    })().catch((err) => {
      nodeRes.statusCode = 500
      nodeRes.statusMessage = 'Internal Server Error'
      nodeRes.end(err instanceof Error ? err.message : String(err))
    })
  })

  httpServer.listen(server.port, () => {
    server.logger.info(`🚀 http://localhost:${server.port}`)
  })

  return httpServer
}

async function streamToArrayBuffer(stream: NodeJS.ReadableStream): Promise<ArrayBuffer> {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    if (chunk instanceof Uint8Array) {
      chunks.push(chunk)
    } else if (Buffer.isBuffer(chunk)) {
      chunks.push(new Uint8Array(chunk))
    } else if (typeof chunk === 'string') {
      chunks.push(new TextEncoder().encode(chunk))
    } else {
      chunks.push(new Uint8Array(chunk as ArrayLike<number>))
    }
  }
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  return result.buffer
}

async function writeResponseToNodeRes(response: Response, nodeRes: http.ServerResponse): Promise<void> {
  nodeRes.statusCode = response.status
  nodeRes.statusMessage = response.statusText

  response.headers.forEach((value, key) => {
    nodeRes.setHeader(key, value)
  })

  if (response.body) {
    const reader = response.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        nodeRes.write(Buffer.from(value))
      }
    } finally {
      reader.releaseLock()
    }
  }

  nodeRes.end()
}

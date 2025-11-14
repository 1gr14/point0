import type connect from 'connect'
import { Readable } from 'node:stream'
import type http from 'node:http'

export function bunConnectAdapter(connectApp: connect.Server) {
  return async (request: Request): Promise<Response> => {
    const urlObj = new URL(request.url)

    // Build Node-style headers
    const reqHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      reqHeaders[key.toLowerCase()] = value
    })

    // Read Bun body -> buffer
    let bodyBuffer: Buffer | null = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const ab = await request.arrayBuffer()
      bodyBuffer = Buffer.from(ab)
    }

    return await new Promise<Response>((resolve) => {
      // Node-like IncomingMessage
      const nodeReq = new Readable({
        read() {
          if (bodyBuffer) {
            this.push(bodyBuffer)
            bodyBuffer = null
          } else {
            this.push(null)
          }
        },
      }) as any

      // 👇 Important: FULL REAL url, as Connect/Vite expect
      const fullPath = request.url.replace(/^https?:\/\/[^/]+/i, '') || '/'

      nodeReq.url = fullPath
      nodeReq.originalUrl = fullPath
      nodeReq.method = request.method
      nodeReq.headers = reqHeaders

      // Needed for Vite middleware:
      nodeReq.protocol = urlObj.protocol.replace(':', '')
      nodeReq.hostname = urlObj.hostname
      nodeReq.secure = nodeReq.protocol === 'https'

      // Fake socket enough for Vite & Connect
      nodeReq.socket = {
        encrypted: nodeReq.secure,
        remoteAddress: '127.0.0.1',
      }

      // Hook for response
      const resHeaders = new Headers()
      const chunks: Buffer[] = []

      const nodeRes: any = {
        statusCode: 200,
        statusMessage: 'OK',

        setHeader(name: string, value: any) {
          const v = Array.isArray(value) ? value.join(', ') : String(value)
          resHeaders.set(name, v)
        },

        appendHeader(name: string, value: any) {
          const v = Array.isArray(value) ? value.join(', ') : String(value)
          const existing = resHeaders.get(name)
          resHeaders.set(name, existing ? `${existing}, ${v}` : v)
        },

        getHeader(name: string) {
          return resHeaders.get(name) ?? undefined
        },

        removeHeader(name: string) {
          resHeaders.delete(name)
        },

        writeHead(statusCode: number, statusMessageOrHeaders?: any, maybeHeaders?: any) {
          nodeRes.statusCode = statusCode

          let headers = undefined
          if (typeof statusMessageOrHeaders === 'string') {
            nodeRes.statusMessage = statusMessageOrHeaders
            headers = maybeHeaders
          } else {
            headers = statusMessageOrHeaders
          }

          if (headers) {
            for (const [key, value] of Object.entries(headers)) {
              if (value != null) {
                nodeRes.setHeader(key, value)
              }
            }
          }
        },

        write(chunk: any) {
          if (typeof chunk === 'string') {
            chunks.push(Buffer.from(chunk))
          } else if (chunk instanceof Uint8Array) {
            chunks.push(Buffer.from(chunk))
          } else if (Buffer.isBuffer(chunk)) {
            chunks.push(chunk)
          } else if (chunk != null) {
            chunks.push(Buffer.from(String(chunk)))
          }
        },

        end(chunk?: any) {
          if (chunk) nodeRes.write(chunk)
          const body = Buffer.concat(chunks)
          resolve(
            new Response(body, {
              status: nodeRes.statusCode,
              headers: resHeaders,
            }),
          )
        },
      }

      // Run Connect app
      connectApp(nodeReq, nodeRes)
    })
  }
}
export async function bunResponseToConnectResponse(upstream: Response, res: http.ServerResponse): Promise<void> {
  res.statusCode = upstream.status
  if (upstream.statusText) {
    res.statusMessage = upstream.statusText
  }

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') return
    res.setHeader(key, value)
  })

  const body = upstream.body
  if (!body) {
    res.end()
    return
  }

  for await (const chunk of body as any) {
    res.write(chunk instanceof Uint8Array ? Buffer.from(chunk) : chunk)
  }

  res.end()
}
export async function connectRequestToBunRequest(req: http.IncomingMessage): Promise<Request> {
  const method = req.method ?? 'GET'

  const headers = new Headers()
  // eslint-disable-next-line guard-for-in
  for (const key in req.headers) {
    const value = req.headers[key]
    if (Array.isArray(value)) headers.set(key, value.join(', '))
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
    else if (value != null) headers.set(key, String(value))
  }

  headers.delete('content-length')
  headers.delete('Content-Length')

  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost'

  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() || (req.socket as any)?.encrypted
      ? 'https'
      : 'http'

  const fullUrl = `${proto}://${String(host)}${req.url ?? '/'}`

  let bodyInit: BodyInit | undefined = undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const buf = await new Promise<Buffer | undefined>((resolve) => {
      const chunks: Buffer[] = []
      req.on('data', (c) => chunks.push(c))
      req.on('end', () => {
        resolve(chunks.length ? Buffer.concat(chunks) : undefined)
      })
      req.on('error', () => {
        resolve(undefined)
      })
    })
    if (buf) bodyInit = new Uint8Array(buf)
  }

  return new Request(fullUrl, {
    method,
    headers,
    body: bodyInit,
  })
}

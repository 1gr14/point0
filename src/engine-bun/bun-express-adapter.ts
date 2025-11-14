import type express from 'express'
import { Readable } from 'node:stream'
import type http from 'node:http'

// вспомогательный тип "нода-подобного" запроса
type NodeLikeRequest = Readable & {
  method?: string
  url?: string
  headers?: http.IncomingHttpHeaders
  socket?: {
    encrypted?: boolean
    remoteAddress?: string
  }
  originalUrl?: string
  protocol?: string
  hostname?: string
  secure?: boolean
}

// минимальный интерфейс ответа, достаточный для Express + Vite
type NodeLikeResponse = {
  statusCode: number
  statusMessage?: string
  setHeader: (name: string, value: string | number | readonly string[]) => void
  appendHeader: (name: string, value: string | number | readonly string[]) => void
  getHeader: (name: string) => string | undefined
  removeHeader: (name: string) => void
  writeHead: (
    statusCode: number,
    statusMessageOrHeaders?: string | http.OutgoingHttpHeaders,
    maybeHeaders?: http.OutgoingHttpHeaders,
  ) => void
  write: (chunk: unknown) => void
  end: (chunk?: unknown) => void
}

// Bun.Request → Express app → Bun.Response
export function bunExpressAdapter(app: express.Express) {
  return async (request: Request): Promise<Response> => {
    const urlObj = new URL(request.url)

    const reqHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      reqHeaders[key.toLowerCase()] = value
    })

    let bodyBuffer: Buffer | null = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const ab = await request.arrayBuffer()
      bodyBuffer = Buffer.from(ab)
    }

    return await new Promise<Response>((resolve) => {
      const nodeReq = new Readable({
        read() {
          if (bodyBuffer) {
            this.push(bodyBuffer)
            bodyBuffer = null
          } else {
            this.push(null)
          }
        },
      }) as NodeLikeRequest

      const fullPath = request.url.replace(/^https?:\/\/[^/]+/i, '') || '/'

      nodeReq.method = request.method
      nodeReq.url = fullPath
      nodeReq.originalUrl = fullPath
      nodeReq.headers = reqHeaders
      nodeReq.protocol = urlObj.protocol.replace(':', '')
      nodeReq.hostname = urlObj.hostname
      nodeReq.secure = nodeReq.protocol === 'https'
      nodeReq.socket = {
        encrypted: nodeReq.secure,
        remoteAddress: '127.0.0.1',
      }

      const resHeaders = new Headers()
      const chunks: Buffer[] = []

      const nodeRes: NodeLikeResponse = {
        statusCode: 200,
        statusMessage: 'OK',

        setHeader(name, value) {
          const v = Array.isArray(value) ? value.join(', ') : String(value)
          resHeaders.set(name, v)
        },

        appendHeader(name, value) {
          const v = Array.isArray(value) ? value.join(', ') : String(value)
          const existing = resHeaders.get(name)
          resHeaders.set(name, existing ? `${existing}, ${v}` : v)
        },

        getHeader(name) {
          return resHeaders.get(name) ?? undefined
        },

        removeHeader(name) {
          resHeaders.delete(name)
        },

        writeHead(statusCode, statusMessageOrHeaders, maybeHeaders) {
          this.statusCode = statusCode

          let headers: http.OutgoingHttpHeaders | undefined

          if (typeof statusMessageOrHeaders === 'string') {
            this.statusMessage = statusMessageOrHeaders
            headers = maybeHeaders
          } else {
            headers = statusMessageOrHeaders
          }

          if (headers) {
            for (const [key, value] of Object.entries(headers)) {
              if (value != null) {
                this.setHeader(key, value as string | number | readonly string[])
              }
            }
          }
        },

        write(chunk) {
          if (typeof chunk === 'string') {
            chunks.push(Buffer.from(chunk))
          } else if (chunk instanceof Uint8Array) {
            chunks.push(Buffer.from(chunk))
          } else if (Buffer.isBuffer(chunk)) {
            chunks.push(chunk)
          } else if (chunk != null) {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            chunks.push(Buffer.from(String(chunk)))
          }
        },

        end(chunk) {
          if (chunk !== undefined) {
            this.write(chunk)
          }
          const body = Buffer.concat(chunks)
          resolve(
            new Response(body, {
              status: this.statusCode,
              headers: resHeaders,
            }),
          )
        },
      }

      // Важно: Express сам синхронный, поэтому просто вызываем его,
      // а Promise резолвится, когда nodeRes.end() будет вызван.
      app(nodeReq as express.Request, nodeRes as unknown as express.Response)
    })
  }
}

// Bun.Response → Express.Response
export async function bunResponseToExpressResponse(upstream: Response, res: express.Response): Promise<void> {
  res.status(upstream.status)

  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'transfer-encoding') {
      return
    }
    res.setHeader(key, value)
  })

  const body = upstream.body
  if (!body) {
    res.end()
    return
  }

  // стриминг тела
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array | string>) {
    if (typeof chunk === 'string') {
      res.write(chunk)
    } else {
      res.write(Buffer.from(chunk))
    }
  }

  res.end()
}

// Express.Request → Bun/Web Request
export async function expressRequestToBunRequest(req: express.Request): Promise<Request> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const method = req.method ?? 'GET'

  const headers = new Headers()
  // eslint-disable-next-line guard-for-in
  for (const key in req.headers) {
    const value = req.headers[key]
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '))
    } else if (value != null) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
      headers.set(key, String(value))
    }
  }

  headers.delete('content-length')
  headers.delete('Content-Length')

  const hostHeader = (req.headers['x-forwarded-host'] as string | undefined) ?? req.headers.host ?? 'localhost'

  const protoHeader =
    ((req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim() ??
    (req.socket as { encrypted?: boolean }).encrypted)
      ? 'https'
      : 'http'

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const fullUrl = `${protoHeader}://${hostHeader}${req.url ?? '/'}`

  let bodyInit: BodyInit | undefined = undefined

  if (method !== 'GET' && method !== 'HEAD') {
    const buf = await new Promise<Buffer | undefined>((resolve) => {
      const chunks: Buffer[] = []

      req.on('data', (chunk: unknown) => {
        if (typeof chunk === 'string') {
          chunks.push(Buffer.from(chunk))
        } else if (chunk instanceof Uint8Array) {
          chunks.push(Buffer.from(chunk))
        } else if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk)
        }
      })

      req.on('end', () => {
        resolve(chunks.length ? Buffer.concat(chunks) : undefined)
      })

      req.on('error', () => {
        resolve(undefined)
      })
    })

    if (buf) {
      bodyInit = new Uint8Array(buf)
    }
  }

  return new Request(fullUrl, {
    method,
    headers,
    body: bodyInit,
  })
}

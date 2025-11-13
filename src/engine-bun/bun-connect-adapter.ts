import type connect from 'connect'
import { Readable } from 'node:stream'
import type http from 'node:http'

export function bunConnectAdapter(connectApp: connect.Server) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url)

    // Headers → node-style объект
    const reqHeaders: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      reqHeaders[key.toLowerCase()] = value
    })

    // Читаем тело один раз в Buffer, превращаем в Node-стрим
    let bodyBuffer: Buffer | null = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const arrayBuffer = await request.arrayBuffer()
      bodyBuffer = Buffer.from(arrayBuffer)
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
      }) as any

      nodeReq.method = request.method
      nodeReq.url = url.pathname + url.search
      nodeReq.originalUrl = nodeReq.url
      nodeReq.headers = reqHeaders
      nodeReq.socket = {}

      const resHeaders = new Headers()
      const chunks: Buffer[] = []

      const nodeRes: any = {
        statusCode: 200,
        setHeader(name: string, value: string) {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
          resHeaders.set(name, String(value))
        },
        getHeader(name: string) {
          return resHeaders.get(name) ?? undefined
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
          if (chunk) this.write(chunk)
          const body = Buffer.concat(chunks)
          resolve(
            new Response(body, {
              status: nodeRes.statusCode ?? 200,
              headers: resHeaders,
            }),
          )
        },
      }

      connectApp(nodeReq, nodeRes)
    })
  }
}

export async function bunResponseToConnectResponse(upstream: Response, res: http.ServerResponse): Promise<void> {
  // status
  res.statusCode = upstream.status
  if (upstream.statusText) {
    // optional: only if you care about statusText
    res.statusMessage = upstream.statusText
  }

  // headers
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (lower === 'transfer-encoding') return // let Node handle this
    res.setHeader(key, value)
  })

  // body (streaming)
  const body = upstream.body
  if (!body) {
    res.end()
    return
  }

  for await (const chunk of body as any) {
    // chunk is Uint8Array | Buffer | string-like
    if (typeof chunk === 'string') {
      res.write(chunk)
    } else {
      res.write(Buffer.from(chunk))
    }
  }

  res.end()
}

export async function connectRequestToBunRequest(req: http.IncomingMessage): Promise<Request> {
  const method = (req.method ?? 'GET').toUpperCase()

  // --- build URL (protocol + host + path) ---
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const headersObj = req.headers || {}

  const forwardedProto =
    (headersObj['x-forwarded-proto'] as string | undefined) ??
    (headersObj['x-forwarded-protocol'] as string | undefined)

  const proto = forwardedProto?.split(',')[0].trim() || ((req.socket as any)?.encrypted ? 'https' : 'http')

  const hostHeader = (headersObj['x-forwarded-host'] as string | undefined) ?? headersObj.host ?? 'localhost'

  const urlPath = req.url ?? '/'
  const fullUrl = `${proto}://${hostHeader}${urlPath}`

  // --- copy headers into Web Headers ---
  const headers = new Headers()
  // eslint-disable-next-line guard-for-in
  for (const key in headersObj) {
    const value = headersObj[key]
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '))
    } else if (value != null) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion
      headers.set(key, String(value))
    }
  }

  // content-length пусть пересчитает Bun / fetch сам
  headers.delete('content-length')
  headers.delete('Content-Length')

  // --- read body (for non-GET/HEAD) ---
  let bodyInit: BodyInit | undefined = undefined

  if (method !== 'GET' && method !== 'HEAD') {
    const bodyBuffer = await new Promise<Buffer | undefined>((resolve) => {
      const chunks: Buffer[] = []

      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      req.on('end', () => {
        if (chunks.length === 0) resolve(undefined)
        else resolve(Buffer.concat(chunks))
      })

      req.on('error', () => {
        resolve(undefined)
      })
    })

    if (bodyBuffer) {
      bodyInit = new Uint8Array(bodyBuffer) // Uint8Array входит в BodyInit
    }
  }

  // --- create Bun/Web Request ---
  const bunRequest = new Request(fullUrl, {
    method,
    headers,
    body: bodyInit,
  })

  return bunRequest
}

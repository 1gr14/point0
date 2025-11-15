import { Readable } from 'node:stream'

export async function callConnectMiddlewareWithBunRequest(
  middleware: (req: any, res: any, next: any) => void,
  bunRequest: Request,
): Promise<Response | undefined> {
  const url = new URL(bunRequest.url)

  return await new Promise<Response | undefined>((resolve, reject) => {
    // --- Fake Node req ------------------------------------------------------
    // Don't read the body - Vite middleware typically doesn't need it,
    // and we need to preserve it for later use in server.fetch()
    const nodeReq = new Readable({
      read() {
        // Provide empty stream - Vite dev middleware doesn't read request bodies
        this.push(null)
      },
    }) as any

    nodeReq.method = bunRequest.method
    nodeReq.url = url.pathname + url.search
    nodeReq.originalUrl = nodeReq.url

    const headers: Record<string, string> = {}
    bunRequest.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value
    })
    nodeReq.headers = headers

    // Needed for Vite middleware:
    nodeReq.protocol = url.protocol.replace(':', '')
    nodeReq.hostname = url.hostname
    nodeReq.secure = nodeReq.protocol === 'https'

    // Fake socket enough for Vite & Connect
    nodeReq.socket = {
      encrypted: nodeReq.secure,
      remoteAddress: '127.0.0.1',
    }

    // --- Fake Node res ------------------------------------------------------
    const middlewareHeaders = new Headers()
    let statusCode = 200
    let statusMessage = 'OK'
    let ended = false
    const chunks: Uint8Array[] = []

    const nodeRes: any = {
      statusCode,
      statusMessage,

      setHeader(name: string, value: any) {
        const v = Array.isArray(value) ? value.join(', ') : String(value)
        middlewareHeaders.set(name, v)
      },

      appendHeader(name: string, value: any) {
        const v = Array.isArray(value) ? value.join(', ') : String(value)
        const existing = middlewareHeaders.get(name)
        middlewareHeaders.set(name, existing ? `${existing}, ${v}` : v)
      },

      getHeader(name: string) {
        return middlewareHeaders.get(name) ?? undefined
      },

      removeHeader(name: string) {
        middlewareHeaders.delete(name)
      },

      writeHead(code: number, statusMessageOrHeaders?: any, maybeHeaders?: any) {
        statusCode = code
        nodeRes.statusCode = code

        let headers = undefined
        if (typeof statusMessageOrHeaders === 'string') {
          statusMessage = statusMessageOrHeaders
          nodeRes.statusMessage = statusMessageOrHeaders
          headers = maybeHeaders
        } else {
          headers = statusMessageOrHeaders
        }

        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            if (v != null) {
              nodeRes.setHeader(k, v)
            }
          }
        }
      },

      write(chunk: any) {
        if (!chunk) return
        if (typeof chunk === 'string') {
          chunks.push(new TextEncoder().encode(chunk))
        } else if (chunk instanceof Uint8Array) {
          chunks.push(chunk)
        } else {
          chunks.push(Buffer.from(chunk))
        }
      },

      end(chunk?: any) {
        if (ended) return
        ended = true
        if (chunk) nodeRes.write(chunk)

        const body = chunks.length === 0 ? null : new Blob(chunks as any)

        const response = new Response(body, {
          status: statusCode,
          headers: middlewareHeaders,
        })

        resolve(response)
      },
    }

    // --- next() handler -----------------------------------------------------
    const next = (err?: any) => {
      if (err) {
        reject(err)
      } else {
        // Vite didn't handle this request
        if (!ended) {
          resolve(undefined)
        }
      }
    }

    // Call Vite's connect middleware stack
    middleware(nodeReq, nodeRes, next)
  })
}

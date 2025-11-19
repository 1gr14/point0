import { parseUrl, type ParsedUrl } from '../core/utils.js'
import type { RequiredCtx } from '../core/types.js'
import type { ClientBun } from '../engine-shared/client.js'
import type { ServerBun } from '../engine-shared/server.js'

export async function serveServerViaBun({
  server,
  requiredCtx,
}: {
  server: ServerBun<true>
  requiredCtx: RequiredCtx
}): Promise<Bun.Server<unknown>> {
  return Bun.serve({
    port: server.port,
    fetch: async (request, bunServer) => {
      const parsedUrl = parseUrl(request.url)

      if (process.env.NODE_ENV !== 'production') {
        for (const client of server.clients) {
          const bunDevServerUpgradeWebSocketResult = await client.upgradeBunDevServerWebSocket(
            request,
            bunServer,
            parsedUrl,
          )
          if (bunDevServerUpgradeWebSocketResult) {
            return bunDevServerUpgradeWebSocketResult.result
          }
          const viteDevServerResponse = await client.fetchViteDevServerMiddleware(request, parsedUrl)
          if (viteDevServerResponse) {
            return viteDevServerResponse
          }
          const bunDevServerResponse = await client.fetchBunDevServerMiddleware(request, parsedUrl)
          if (bunDevServerResponse) {
            return bunDevServerResponse
          }
        }
      }

      return await server.fetch({ parsedUrl, request, requiredCtx })
    },
    websocket: {
      open(ws) {
        if (process.env.NODE_ENV !== 'production') {
          // Only proxy WebSocket connections that have a wsUrl (Bun dev server connections)
          const data = ws.data as { wsUrl?: string; upstream?: WebSocket }
          if (!data.wsUrl) {
            return
          }

          // Connect to upstream WebSocket when client connects
          const upstream = new WebSocket(data.wsUrl)

          upstream.onopen = () => {
            // Store upstream reference in ws data
            data.upstream = upstream
          }

          upstream.onmessage = (event) => {
            // Forward messages from upstream to client
            ws.send(event.data)
          }

          upstream.onclose = () => {
            ws.close()
          }

          upstream.onerror = () => {
            ws.close()
          }

          // Store upstream for later use
          data.upstream = upstream
        }
      },
      message(ws, message) {
        // Forward messages from client to upstream (only for proxied connections)
        if (process.env.NODE_ENV !== 'production') {
          const data = ws.data as { upstream?: WebSocket }
          if (data.upstream && data.upstream.readyState === WebSocket.OPEN) {
            data.upstream.send(message)
          }
        }
      },
      close(ws) {
        if (process.env.NODE_ENV !== 'production') {
          // Clean up upstream connection when client disconnects
          const data = ws.data as { upstream?: WebSocket }
          if (data.upstream) {
            data.upstream.close()
          }
        }
      },
    },
  })
}

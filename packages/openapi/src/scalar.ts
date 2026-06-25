import type { ApiReferenceConfigurationWithSource } from '@scalar/types/api-reference'
import { serializeToJsLiteral } from './serialize.js'

/**
 * Scalar UI configuration — the `@scalar/api-reference` config (e.g. `theme`, `url`, `onLoaded`). In the
 * {@link openapi} middleware you pass these (plus a `route`) under the `scalar` option; the spec `url` defaults to the
 * JSON route so you don't repeat it.
 *
 * Full reference: https://1gr14.dev/point0/latest/openapi
 */
export type ScalarOptions = Partial<ApiReferenceConfigurationWithSource>

/**
 * Render a standalone Scalar API-reference HTML page for the given options, loading the Scalar bundle from a CDN. The
 * {@link openapi} middleware serves this at the `scalar` route; call it directly only if you serve the UI yourself.
 *
 * Full reference: https://1gr14.dev/point0/latest/openapi
 */
export const getScalarHtml = (options: ScalarOptions): string => {
  return `<!doctype html>
<html lang="en">
  <head>
    <title>API Reference</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <!-- Load the Script -->
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <!-- Initialize the API Reference -->
    <script>
      Scalar.createApiReference('#app', ${serializeToJsLiteral(options)})
    </script>
  </body>
</html>`
}

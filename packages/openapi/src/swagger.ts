import type { SwaggerUIOptions } from 'swagger-ui'
import { serializeToJsLiteral } from './serialize.js'

/**
 * Swagger UI configuration — `swagger-ui` options (e.g. `showExtensions`, `url`, `layout`). In the {@link openapi}
 * middleware you pass these (plus a `route`) under the `swagger` option; the spec `url` defaults to the JSON route so
 * you don't repeat it.
 *
 * Full reference: https://1gr14.dev/point0/latest/openapi
 */
export type SwaggerOptions = Partial<SwaggerUIOptions>

/**
 * Render a standalone Swagger UI HTML page for the given options, loading the swagger-ui bundle from a CDN. The
 * {@link openapi} middleware serves this at the `swagger` route; call it directly only if you serve the UI yourself.
 *
 * Full reference: https://1gr14.dev/point0/latest/openapi
 */
export const getSwaggerHtml = (options: SwaggerOptions): string => {
  const defaultedOptions = {
    dom_id: '#swagger-ui',
    layout: 'BaseLayout',
    presets: ['SwaggerUIBundle.presets.apis', 'SwaggerUIStandalonePreset'],
    ...options,
  }
  const { presets, ...restOptions } = defaultedOptions
  const presetsLiteral = Array.isArray(presets)
    ? `[${presets.map((preset) => (typeof preset === 'string' ? preset : serializeToJsLiteral(preset))).join(', ')}]`
    : undefined
  const optionsLiteral = serializeToJsLiteral(restOptions)
  const optionsWithPresetsLiteral = presetsLiteral
    ? optionsLiteral.replace(/\}\s*$/, `${Object.keys(restOptions).length > 0 ? ', ' : ''}presets: ${presetsLiteral} }`)
    : optionsLiteral

  return `<!doctype html>
<html lang="en">
  <head>
    <title>Swagger UI</title>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
    <script>
      SwaggerUIBundle(${optionsWithPresetsLiteral})
    </script>
  </body>
</html>`
}

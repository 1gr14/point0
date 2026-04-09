import type { SwaggerUIOptions } from 'swagger-ui'
import { serializeToJsLiteral } from './serialize.js'

export type SwaggerOptions = Partial<SwaggerUIOptions>

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

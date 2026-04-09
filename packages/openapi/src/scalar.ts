import type { ApiReferenceConfigurationWithSource } from '@scalar/types/api-reference'
import { serializeToJsLiteral } from './serialize.js'

export type ScalarOptions = Partial<ApiReferenceConfigurationWithSource>

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

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="vite/client" />

declare module '*.svg?react' {
  import type * as React from 'react'
  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
  export default ReactComponent
}

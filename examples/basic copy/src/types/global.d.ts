declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.mdx' {
  import type { ComponentType } from 'react'

  const MDXContent: ComponentType<Record<string, unknown>>
  export default MDXContent
  export const page: unknown
}

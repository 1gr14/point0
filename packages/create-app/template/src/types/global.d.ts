declare module '*.css' {}

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const MDXContent: ComponentType<any>
  export default MDXContent
  export const page: unknown
  export const frontmatter: Record<string, unknown>
}

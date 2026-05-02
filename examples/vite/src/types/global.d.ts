declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const MDXContent: ComponentType<any>
  export default MDXContent
  export const page: unknown
  export const frontmatter: Record<string, unknown>
}

declare module '*.md' {
  import type { ComponentType } from 'react'
  const MDXContent: ComponentType<any>
  export default MDXContent
  export const frontmatter: Record<string, unknown>
}

declare module '*.mdc' {
  import type { ComponentType } from 'react'
  const MDXContent: ComponentType<any>
  export default MDXContent
  export const frontmatter: Record<string, unknown>
}

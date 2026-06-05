// `*.svg` (and the other managed asset extensions + query forms) are declared in the generated
// `generated/point0/assets.d.ts` (see `generate.assetsTypes`). Keep only the non-asset module shims here.
declare module '*.css' {}

declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const MDXContent: ComponentType<any>
  export default MDXContent
  export const page: unknown
  export const frontmatter: Record<string, unknown>
}

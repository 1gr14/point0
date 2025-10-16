// import type { HTMLAttributes, JSX } from 'react'

// // Base attribute bag
// type Attributes = Record<string, string>

// // Generic extras
// interface OtherElementAttributes {
//   [key: string]: string | number | boolean | null | undefined
// }

// // Core element prop types
// export type HtmlProps = JSX.IntrinsicElements['html'] & OtherElementAttributes
// export type BodyProps = JSX.IntrinsicElements['body'] & OtherElementAttributes
// export type LinkProps = JSX.IntrinsicElements['link']
// export type MetaProps = JSX.IntrinsicElements['meta'] & {
//   charset?: string
//   'http-equiv'?: string
//   itemprop?: string
// }
// export type TitleProps = HTMLAttributes<HTMLTitleElement>
// export type ScriptProps = HTMLAttributes<HTMLScriptElement>
// export type StyleProps = HTMLAttributes<HTMLStyleElement>
// export type NoscriptProps = HTMLAttributes<HTMLElement>

// export type MetaMap = {
//   html: HtmlProps
//   body: BodyProps
//   base: Attributes
//   link: LinkProps
//   meta: MetaProps
//   noscript: NoscriptProps
//   script: ScriptProps
//   style: StyleProps
//   title: TitleProps
//   titleAttributes: Attributes
// }

// too much

export type MetaMap = Record<string, Record<string, string | boolean | number>>

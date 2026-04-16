// declare module 'react-server-dom-bun/client.browser' {
//   // This represents the stream data that React can eventually render
//   export type ReactServerPayload = {
//     then(onFulfilled: (value: React.ReactNode) => void, onRejected: (reason: any) => void): void
//   }

//   export function createFromReadableStream<T = React.ReactNode>(
//     stream: ReadableStream,
//     options?: {
//       ssrManifest?: any
//       nonce?: string
//     },
//   ): Promise<T> & T // It is both a Promise and the eventual value to React
// }

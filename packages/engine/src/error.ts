import type { ClassLikeError0 } from '@point0/core'

export const toJsonErrorResponse = (ErrorClass: ClassLikeError0, error: unknown, status?: number) => {
  const error0 = ErrorClass.from(error)
  status ??= error0.status ?? 500
  if (error0.status !== status) {
    error0.status = status
  }
  const json = ErrorClass.serialize(error0)
  return new Response(JSON.stringify(json), { headers: { 'Content-Type': 'application/json' }, status })
}

export const toTextErrorResponse = (ErrorClass: ClassLikeError0, error: unknown, status: number) => {
  return new Response(ErrorClass.from(error).message, {
    headers: { 'Content-Type': 'text/html' },
    status,
  })
}

// export const toSuitableErrorResponse = (ErrorClass: ClassLikeError0, error: unknown, status: number, json = true) => {
//   if (json) {
//     return toJsonErrorResponse(ErrorClass, error, status)
//   } else {
//     return toTextErrorResponse(ErrorClass, error, status)
//   }
// }

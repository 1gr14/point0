import { Error0 } from '@devp0nt/error0'

export const toJsonErrorResponse = (error: unknown, status: number) => {
  return new Response(JSON.stringify(Error0.toJSON(error)), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

export const toTextErrorResponse = (error: unknown, status: number) => {
  return new Response(Error0.toJSON(error).message, {
    headers: { 'Content-Type': 'text/html' },
    status,
  })
}

export const toSuitableErrorResponse = (error: unknown, status: number, json = true) => {
  if (json) {
    return toJsonErrorResponse(error, status)
  } else {
    return toTextErrorResponse(error, status)
  }
}

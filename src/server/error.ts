// TODO: use Error0
export type ErrorParsed = {
  status: number
  message: string
  meta: Record<string, unknown>
}
export type ErrorJsonResponse = { error: Omit<ErrorParsed, 'status'>; data?: Record<string, any> | undefined }

export type ParseErrorInput = {
  prefix?: string
  message?: string
  error?: unknown
  meta?: Record<string, unknown>
  status?: number
}
export const parseError = ({
  prefix,
  message: providedMessage,
  error,
  meta: providedMeta,
  status: providedStatus,
}: {
  prefix?: string
  message?: string
  error?: unknown
  meta?: Record<string, unknown>
  status?: number
}): ErrorParsed => {
  if (!error) {
    return {
      message: providedMessage ?? 'Unknown error',
      status: providedStatus ?? 500,
      meta: providedMeta ?? {},
    }
  }
  const errorMeta =
    typeof error === 'object' &&
    'meta' in error &&
    typeof error.meta === 'object' &&
    error.meta !== null &&
    !Array.isArray(error.meta) &&
    Object.getPrototypeOf(error.meta) === Object.prototype
      ? error.meta
      : {}
  const messageOriginal =
    providedMessage ||
    (typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message) ||
    'Unknown error'
  const message = [prefix, messageOriginal].filter(Boolean).join(': ')
  return {
    message,
    status:
      providedStatus ||
      (typeof error === 'object' &&
        'httpStatus' in error &&
        typeof error.httpStatus === 'number' &&
        error.httpStatus) ||
      (typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status) ||
      500,
    meta: { ...errorMeta, ...providedMeta },
  }
}

export type ToJsonErrorResponseInput = ParseErrorInput & {
  data?: Record<string, any> | undefined
}
export const toJsonErrorResponse = ({ data, ...props }: ToJsonErrorResponseInput) => {
  const { status, ...jsonError } = parseError(props)
  return new Response(JSON.stringify({ error: jsonError, data }), {
    headers: { 'Content-Type': 'application/json' },
    status,
  })
}

export type ToTextErrorResponseInput = ToJsonErrorResponseInput
export const toTextErrorResponse = ({ data, ...props }: ToTextErrorResponseInput) => {
  const { status, ...jsonError } = parseError(props)
  return new Response(jsonError.message, {
    headers: { 'Content-Type': 'text/html' },
    status,
  })
}

export type ToSuitableErrorResponseInput = ToJsonErrorResponseInput & {
  accept?: string[] | undefined
}
export const toSuitableErrorResponse = ({ accept, ...props }: ToSuitableErrorResponseInput) => {
  if (!accept || accept.includes('application/json')) {
    return toJsonErrorResponse(props)
  } else {
    return toTextErrorResponse(props)
  }
}

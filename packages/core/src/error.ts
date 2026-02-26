export class ErrorPoint0 extends Error {
  status?: number
  code?: string

  constructor(message: string, options: { cause?: unknown; status?: number; code?: string }) {
    super(message, { cause: options.cause })
    this.status = options.status
    this.code = options.code
    this.name = 'ErrorPoint0'
  }

  static from(error: unknown): ErrorPoint0 {
    if (error instanceof ErrorPoint0) {
      return error
    }
    const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
    const message =
      typeof record.message === 'string' ? record.message : typeof error === 'string' ? error : 'Unknown error'
    const status = typeof record.status === 'number' ? record.status : undefined
    const code = typeof record.code === 'string' ? record.code : undefined
    const stack = typeof record.stack === 'string' ? record.stack : undefined
    const error0 = new ErrorPoint0(message, {
      cause: error,
      status,
      code,
    })
    if (stack) {
      error0.stack = stack
    }
    return error0
  }

  static serialize(error: ErrorPoint0): Record<string, unknown> {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
      ...(process.env.NODE_ENV === 'production' || !error.stack ? {} : { stack: error.stack }),
    }
  }
}

export type ClassLikeError0<T extends Error = Error> = {
  new (message: string, options: { cause?: unknown; status?: number; code?: string }): T
  from(error: unknown): T
  serialize(error: T): Record<string, unknown>
}
export type InstanceByClassError0<T extends ClassLikeError0> = T extends ClassLikeError0<infer I> ? I : never

// expectTypeOf<typeof ErrorPoint0>().toExtend<ClassLikeError0<ErrorPoint0>>()
// expectTypeOf<typeof ErrorPoint0>().toExtend<ClassLikeError0<Error>>()

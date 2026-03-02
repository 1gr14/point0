export class ErrorPoint0 extends Error {
  status?: number
  code?: string
  // meta?: Record<string, unknown>

  constructor(
    message: string,
    // options: { cause?: unknown; status?: number; code?: string; meta?: Record<string, unknown> } = {},
    options: { cause?: unknown; status?: number; code?: string } = {},
  ) {
    super(message, { cause: options.cause })
    this.status = options.status
    this.code = options.code
    this.name = 'ErrorPoint0'
    if (
      process.env.NODE_ENV !== 'production' &&
      typeof (globalThis as unknown as Record<string, unknown>).__ERROR0_FIX_STACKTRACE__ === 'function'
    ) {
      try {
        ;(globalThis as any).__ERROR0_FIX_STACKTRACE__(this) as void
      } catch {}
    }
    // this.meta = options.meta
  }

  static from(error: unknown): ErrorPoint0 {
    if (error instanceof ErrorPoint0) {
      return error
    }
    if (
      process.env.NODE_ENV !== 'production' &&
      typeof (globalThis as unknown as Record<string, unknown>).__ERROR0_FIX_STACKTRACE__ === 'function'
    ) {
      try {
        ;(globalThis as any).__ERROR0_FIX_STACKTRACE__(error) as void
      } catch {}
    }
    const record = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {}
    const message =
      typeof record.message === 'string' ? record.message : typeof error === 'string' ? error : 'Unknown error'
    const isSerializedErrorPoint0 = record.name === 'ErrorPoint0'
    const isOriginalError = error instanceof Error && error.constructor === Error
    const cause: unknown = isSerializedErrorPoint0 ? undefined : isOriginalError ? error.cause : error
    const status = typeof record.status === 'number' ? record.status : undefined
    const code = typeof record.code === 'string' ? record.code : undefined
    const stack = typeof record.stack === 'string' ? record.stack : undefined
    const error0 = new ErrorPoint0(message, {
      cause,
      status,
      code,
    })
    if (stack) {
      error0.stack = stack
    }
    return error0
  }

  static serialize(error: ErrorPoint0): Record<string, unknown> {
    // const meta = (() => {
    //   try {
    //     return JSON.parse(JSON.stringify(error.meta))
    //   } catch {
    //     console.error('ErrorPoint0 meta is not serializable', error.meta)
    //     return undefined
    //   }
    // })()
    const isStacktracePublic =
      process.env.ERROR0_PUBLIC_STACKTRACE === 'true'
        ? true
        : process.env.ERROR0_PUBLIC_STACKTRACE === 'false'
          ? false
          : process.env.NODE_ENV === 'production'
            ? false
            : true
    return {
      name: 'ErrorPoint0',
      message: error.message,
      ...(error.status ? { status: error.status } : {}),
      ...(error.code ? { code: error.code } : {}),
      // ...(meta ? { meta } : {}),
      ...(!isStacktracePublic || !error.stack ? {} : { stack: error.stack }),
    }
  }
}

export type ClassLikeError0<T extends ErrorPoint0 = ErrorPoint0> = {
  new (message: string, options?: { cause?: unknown; status?: number; code?: string }): T
  from(error: unknown): T
  serialize(error: T): Record<string, unknown>
}
// export type InstanceByClassError0<T extends ClassLikeError0> = T extends ClassLikeError0<infer I> ? I : never

// expectTypeOf<typeof ErrorPoint0>().toExtend<ClassLikeError0<ErrorPoint0>>()
// expectTypeOf<typeof ErrorPoint0>().toExtend<ClassLikeError0<Error>>()

import type { AdapterNavigateOptions, SpecialNavigateOptions } from './navigation.js'

export type RedirectTaskSerialized<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> = {
  to: string
  status?: number
  options?: TAdapterNavigateOptions & SpecialNavigateOptions<TAdapterNavigateOptions>
}

export class RedirectTask<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions> {
  readonly to: string
  readonly status?: number
  readonly options?: TAdapterNavigateOptions & SpecialNavigateOptions<TAdapterNavigateOptions>

  constructor({ to, status, options }: RedirectTaskSerialized<TAdapterNavigateOptions>) {
    this.to = to
    this.status = status
    this.options = options
  }

  serialize(): RedirectTaskSerialized<TAdapterNavigateOptions> {
    return {
      to: this.to,
      ...(this.status !== undefined ? { status: this.status } : {}),
      ...(this.options !== undefined ? { options: this.options } : {}),
    }
  }

  static from<TAdapterNavigateOptions extends AdapterNavigateOptions = AdapterNavigateOptions>(
    input:
      | string
      | Record<string, unknown>
      | RedirectTaskSerialized<TAdapterNavigateOptions>
      | RedirectTask<TAdapterNavigateOptions>,
  ): RedirectTask<TAdapterNavigateOptions> {
    try {
      if (input instanceof RedirectTask) {
        return input
      }
      const parsed = typeof input === 'string' ? JSON.parse(input) : input
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('input must be an object')
      }
      if (typeof parsed.to !== 'string') {
        throw new Error('to must be a string')
      }
      if (parsed.status !== undefined && typeof parsed.status !== 'number') {
        throw new Error('status must be a number')
      }
      if ((parsed.options !== undefined && typeof parsed.options !== 'object') || parsed.options === null) {
        throw new Error('options must be an object')
      }
      return new RedirectTask({
        to: parsed.to,
        status: parsed.status,
        options: parsed.options as TAdapterNavigateOptions & SpecialNavigateOptions<TAdapterNavigateOptions>,
      })
    } catch (error) {
      throw new Error('Failed to parse redirect task: ' + (error instanceof Error ? error.message : String(error)))
    }
  }
}

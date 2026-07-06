import { useEffect, useRef, useState } from 'react'
import { stringify } from 'safe-stable-stringify'
import { _point0_env } from './env.js'
import { type NiceSuperStoreItem, superstore } from './super-store.js'
import { _ss } from './internals.js'

export type SsrStorePendingMap = Map<string, { value: unknown }>

/**
 * SsrStore — a piece of state that is computed on the server during SSR and transferred to the client, but never sent
 * back to the server (unlike cookies, which travel both ways). It is a thin, cookie-store-shaped wrapper over a
 * `clientServerTransferredSsr` super-store item: you declare one value at a time and get `get` / `set` / `use`.
 *
 * The point of it: a layout can render some default value (e.g. a page description), and a page deeper in the tree can
 * override it during SSR by calling `item.set(newValue)` from inside `useEffectSsr`.
 *
 * On the server `set` does NOT mutate the value immediately. It stages the value; the SSR prefetch loop applies staged
 * values between renders (`commitPending`) and re-renders until they stop changing — exactly like a React state setter
 * does not affect the current render. This is what makes `ssr.allowedDiscoveryRenders: 1` a clean "no re-render" mode:
 * a `set()` in the final render is simply never committed, so the HTML and the transferred value stay consistent.
 *
 * On the client `set` is just a React state update — every component reading the value through `use` re-renders.
 *
 * @example
 *   ;```ts
 *   // declared once, shared across the app
 *   export const pageDescription = SsrStore.define('page.description', () => 'Default description')
 *
 *   // in a layout
 *   const description = pageDescription.use()
 *
 *   // in a page, after a query resolved
 *   useEffectSsr(() => {
 *     pageDescription.set(post.description)
 *   }, [post.description])
 *   ```
 */
export class SsrStore {
  /** Every item declared via `SsrStore.define`, keyed by name. Drives the server commit lifecycle. */
  private static readonly registry = new Map<string, SsrStoreItem<unknown>>()

  /**
   * Declare a single SSR value.
   *
   * @param name Globally unique key (also the super-store item name).
   * @param init Produces the server-side default value. Called lazily on first access.
   */
  static define<TValue>(name: string, init: () => TValue): SsrStoreItem<TValue> {
    const item = superstore.define<TValue>(name, init, 'clientServerTransferredSsr')
    const ssrStoreItem = new SsrStoreItem<TValue>(name, item)
    SsrStore.registry.set(name, ssrStoreItem as unknown as SsrStoreItem<unknown>)
    return ssrStoreItem
  }

  /**
   * Whether any value staged via `set()` during the current SSR render differs from its committed value. Compared by
   * deterministic serialization, so re-setting an equal (but newly constructed) value does not count as a change.
   * Server-only; does not mutate anything.
   */
  static hasPendingChanges(): boolean {
    const pending = _ss.__POINT0_SSR_STORE_PENDING__.getOrUndefined()
    if (!pending) {
      return false
    }
    for (const [name, staged] of pending) {
      const item = SsrStore.registry.get(name)
      if (!item) {
        continue
      }
      if (stringify(staged.value) !== stringify(item.getCommitted())) {
        return true
      }
    }
    return false
  }

  /** Apply every staged value to its committed value, then clear the staging area. Server-only. */
  static commitPending(): void {
    const pending = _ss.__POINT0_SSR_STORE_PENDING__.getOrUndefined()
    if (!pending) {
      return
    }
    for (const [name, staged] of pending) {
      SsrStore.registry.get(name)?.commit(staged.value)
    }
    pending.clear()
  }
}

export class SsrStoreItem<TValue> {
  readonly name: string
  private readonly item: NiceSuperStoreItem<TValue, TValue>
  private readonly listeners = new Set<() => void>()

  constructor(name: string, item: NiceSuperStoreItem<TValue, TValue>) {
    this.name = name
    this.item = item
  }

  /** Read the committed value (server: from the SSR render scope, client: from the hydrated state). */
  get = (): TValue => {
    return this.item.get()
  }

  /** @internal Read the committed value directly. Used by the server commit lifecycle. */
  getCommitted(): TValue {
    return this.item.get()
  }

  /** @internal Write the committed value directly. Used by the server commit lifecycle. */
  commit(value: TValue): void {
    this.item.set(value)
  }

  /**
   * Set the value.
   *
   * - On the server: stages the value. It is applied to the committed value between renders by
   *   `SsrStore.commitPending()`, so the current render keeps reading the old value (and a `set()` in a render that is
   *   never followed by another render is simply dropped).
   * - On the client: behaves like a React state setter — every `use()` re-renders.
   */
  set = (value: TValue): void => {
    if (_point0_env.side.is.server) {
      const pending = _ss.__POINT0_SSR_STORE_PENDING__.get()
      pending.set(this.name, { value })
      return
    }
    this.item.set(value)
    for (const listener of this.listeners) {
      listener()
    }
  }

  /**
   * Reactively read the value.
   *
   * - On the server: returns the current committed value directly.
   * - On the client: returns a React state that updates whenever `set()` is called.
   *
   * @param onChange Optional callback fired on the client when the value changes.
   */
  use = (onChange?: (value: TValue) => void): TValue => {
    if (_point0_env.side.is.server) {
      return this.get()
    }

    const initialValue = this.get()
    const [value, setValue] = useState<TValue>(initialValue)
    const onChangeRef = useRef(onChange)
    const prevValueRef = useRef<TValue>(initialValue)

    useEffect(() => {
      onChangeRef.current = onChange
    }, [onChange])

    useEffect(() => {
      const listener = () => {
        const newValue = this.get()
        if (newValue !== prevValueRef.current) {
          setValue(newValue)
          onChangeRef.current?.(newValue)
          prevValueRef.current = newValue
        }
      }
      this.listeners.add(listener)
      return () => {
        this.listeners.delete(listener)
      }
    }, [])

    return value
  }
}

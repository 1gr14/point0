import { describe, expectTypeOf, it } from 'bun:test'
import type { IsEmptyObject, IsEmptyObjectSpecial } from '../src/types.js'

describe('types', () => {
  it('IsEmptyObject', () => {
    expectTypeOf<IsEmptyObject<{ a: 1 }>>().toEqualTypeOf<false>()
    // biome-ignore lint/complexity/noBannedTypes: ok
    expectTypeOf<IsEmptyObject<{}>>().toEqualTypeOf<true>()
    expectTypeOf<IsEmptyObject<Record<never, never>>>().toEqualTypeOf<true>()
    expectTypeOf<IsEmptyObjectSpecial<{ a: 1 } | { b: 2 }>>().toEqualTypeOf<false>()
  })
})

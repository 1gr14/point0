/**
 * Can a socket callback reference ITS OWN const inside its own initializer chain? Two shapes, two answers to the same
 * question — nothing may be INFERRED from the callback, or TypeScript hits "referenced in its own initializer":
 *
 * - `.serverReply<T>()` — the explicit generic names the reply type, so the callback's return is checked, not read.
 * - `.joiner` / `.enroller` — no generic at all any more: the room comes from the space OPENER (`.lets<{ chatId: string
 *   }>('space', 'chat')`), so a joiner calling its own space's `memberships.*` just compiles.
 *
 * If this file compiles without `@ts-expect-error`, both answers are yes.
 */
import { describe, expect, it } from 'bun:test'
import { z } from 'zod'
import { Point0 } from '../src/point0.js'

const root = Point0.lets('root', 'selfrefProbe').root()

const probeChannel = root
  .lets('channel', 'selfrefChannel')
  .connector(async () => ({ userId: 'u1' }))
  .channel()

// the self-reference: the callback answers imperatively, then keeps working with THIS handler's own const —
// referencing it inside its own initializer chain. The explicit generic types the reply, so nothing is inferred
// from the reference.
export const selfReferencingHandler = probeChannel
  .lets('serverHandler', 'selfReferencing')
  .clientSend(z.object({ task: z.string() }))
  .serverReply<{ accepted: boolean }>(async ({ input, reply }) => {
    reply({ accepted: true })
    setTimeout(() => {
      void selfReferencingHandler.point
    }, 0)
    void input.task
  })
  .serverHandler()

// the joiner reads its OWN space's server surface — a cap check over the rooms this connection already holds — and
// the enroller does the same. Both are declared with NO type argument: the opener's `<{ chatId: string }>` is what
// types the rooms, so neither callback feeds any inference and the self-reference is just a value reference. (The
// reference lives in a guard, not in the returned expression: a RETURN value computed from the const would still make
// TypeScript infer the callback's return type through the const — the same plain circularity every `const` has.)
export const selfReferencingSpace = probeChannel
  .lets<{ chatId: string }>('space', 'selfReferencingSpace')
  .input(z.object({ chatId: z.string() }))
  .joiner(({ input, connectionId }) => {
    if (selfReferencingSpace.memberships.server.local.rooms({ connectionId }).length >= 3) {
      throw new Error('too many rooms')
    }
    return { chatId: input.chatId }
  })
  .enroller(({ connectionId }) => {
    void selfReferencingSpace.memberships.server.local.count({ connectionId })
    return { chatId: 'general' }
  })
  .space()

describe('socket self-reference', () => {
  it('a serverReply<T> referencing its own handler const compiles — the generic breaks the inference cycle', () => {
    expect(selfReferencingHandler.point.type).toBe('serverHandler')
  })

  it('a joiner/enroller calling its own space compiles with NO explicit generic — the opener declared the room', () => {
    expect(selfReferencingSpace.point.type).toBe('space')
    expect(typeof selfReferencingSpace.point._joinerFn).toBe('function')
    expect(typeof selfReferencingSpace.point._enrollerFn).toBe('function')
  })
})

import { describe, expect, it } from 'bun:test'
import * as React from 'react'
import { ErrorPoint0, RscHoleRegistry, type DataTransformerExtended } from '@point0/core'
import { buildHolePushPayload, createHoleNdjsonStream } from '../src/rsc-stream.js'

// Unit tests for the NDJSON hole framing — no server: a hand-fed RscHoleRegistry drives the exported stream factory
// directly. The full in-process flows (framing over a real fetch, fills, boundaries) live in rsc.fast.test.tsx.

const jsonTransformer = {
  serialize: (value: unknown) => value,
  deserialize: (value: unknown) => value,
  stringify: (value: unknown) => JSON.stringify(value),
  parse: (stringified: string) => JSON.parse(stringified) as unknown,
} as unknown as DataTransformerExtended

describe('rsc stream units', () => {
  it('a failed hole crosses the wire as the PUBLIC error projection in production — meta and stack stay server-side', async () => {
    const holes = new RscHoleRegistry()
    const entry = holes.register(() =>
      Promise.reject(
        new ErrorPoint0('kaput', { code: 'POINT0_NOT_FOUND', meta: { secretDsn: 'postgres://u:p@host/db' } }),
      ),
    )
    await entry.throwable
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    let prodError: Record<string, unknown>
    let prodLine: string
    try {
      const payload = buildHolePushPayload(entry, ErrorPoint0)
      prodError = payload.error as Record<string, unknown>
      prodLine = JSON.stringify(payload)
    } finally {
      process.env.NODE_ENV = prevNodeEnv
    }
    expect(prodError.message).toBe('kaput')
    expect(prodError.code).toBe('POINT0_NOT_FOUND')
    expect(prodError.meta).toBeUndefined()
    expect(prodError.stack).toBeUndefined()
    expect(prodLine).not.toContain('secretDsn')
    // dev/test keeps the operator view: the same entry serializes with meta and stack for the developer
    const devError = buildHolePushPayload(entry, ErrorPoint0).error as Record<string, unknown>
    expect(devError.meta).toEqual({ secretDsn: 'postgres://u:p@host/db' })
    expect(typeof devError.stack).toBe('string')
  })

  it('a promise-prop hole drains exactly like a defer hole — a value fill line, and a PUBLIC error projection when it rejects in production', async () => {
    // Promise props register plain promises in the same registry (no element normalize step) — pin that the framing
    // treats them identically: the resolved VALUE rides a fill line, and a rejection serializes with the same
    // public-in-production projection a failed defer subtree gets.
    const holes = new RscHoleRegistry()
    const good = holes.register(() => Promise.resolve({ n: 42, label: 'pp-late-value' }))
    const bad = holes.register(() =>
      Promise.reject(new ErrorPoint0('pp-kaput', { code: 'POINT0_NOT_FOUND', meta: { secretDsn: 'postgres://x' } })),
    )
    await Promise.all([good.throwable, bad.throwable])
    const prevNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    let text: string
    try {
      // constructed inside the production window — the stream's start() drains the settled holes immediately
      const stream = createHoleNdjsonStream({
        firstLine: '{"a":1}',
        holeRegistry: holes,
        transformer: jsonTransformer,
        ErrorClass: ErrorPoint0,
        emit: undefined,
      })
      text = await new Response(stream).text()
    } finally {
      process.env.NODE_ENV = prevNodeEnv
    }
    const lines = text.split('\n').filter((line) => line.length > 0)
    expect(lines).toHaveLength(3)
    const fills = lines.slice(1).map((line) => JSON.parse(line) as Record<string, unknown>)
    const valueFill = fills.find((fill) => fill.id === good.id)!
    expect(valueFill.data).toEqual({ n: 42, label: 'pp-late-value' })
    const errorFill = fills.find((fill) => fill.id === bad.id)!
    const error = errorFill.error as Record<string, unknown>
    expect(error.message).toBe('pp-kaput')
    expect(error.code).toBe('POINT0_NOT_FOUND')
    expect(error.meta).toBeUndefined()
    expect(error.stack).toBeUndefined()
    expect(text).not.toContain('secretDsn')
  })

  it('cancelling the stream mid-drain (client disconnected) stops delivery without erroring', async () => {
    const holes = new RscHoleRegistry()
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const entry = holes.register(async () => {
      await gate
      return React.createElement('b', null, 'late')
    })
    const stream = createHoleNdjsonStream({
      firstLine: '{"a":1}',
      holeRegistry: holes,
      transformer: jsonTransformer,
      ErrorClass: ErrorPoint0,
      emit: undefined,
    })
    const reader = stream.getReader()
    const first = await reader.read()
    expect(new TextDecoder().decode(first.value)).toContain('{"a":1}')
    await reader.cancel() // the client navigated away mid-stream
    release() // …and only then the slow subtree resolves
    await entry.throwable
    await new Promise((resolve) => setTimeout(resolve, 10))
    // the drain observed the cancel and stopped: the resolved hole is never taken, nothing enqueues after cancel
    expect(entry.settled).toBe(true)
    expect(entry.delivered).toBe(false)
  })

  it('writes blank-line heartbeats while a hole is pending, then the fill — the socket never looks idle', async () => {
    const holes = new RscHoleRegistry()
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    const entry = holes.register(async () => {
      await gate
      return React.createElement('b', null, 'late')
    })
    const stream = createHoleNdjsonStream({
      firstLine: '{"a":1}',
      holeRegistry: holes,
      transformer: jsonTransformer,
      ErrorClass: ErrorPoint0,
      emit: undefined,
      heartbeatMs: 15,
    })
    setTimeout(release, 70)
    const chunks: string[] = []
    const reader = stream.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(new TextDecoder().decode(value))
    }
    const text = chunks.join('')
    // at least one blank heartbeat line landed between line 1 and the fill (15ms beat vs the 70ms-slow subtree)
    expect(text).toContain('\n\n')
    expect(text).toContain('late')
    expect(entry.delivered).toBe(true)
  })

  it('a multi-line stringify fails the stream loudly instead of corrupting the NDJSON framing', async () => {
    const holes = new RscHoleRegistry()
    const entry = holes.register(async () => React.createElement('b'))
    await entry.throwable
    const prettyTransformer = {
      ...jsonTransformer,
      stringify: (value: unknown) => JSON.stringify(value, null, 2),
    } as unknown as DataTransformerExtended
    const stream = createHoleNdjsonStream({
      firstLine: '{"a":1}', // line 1 is stringified by the caller — here single-line, so it passes
      holeRegistry: holes,
      transformer: prettyTransformer,
      ErrorClass: ErrorPoint0,
      emit: undefined,
    })
    // the hole is already settled, so the drain hits the guard during construction — erroring the stream discards the
    // queued line 1 and the very first read rejects (live, a later fill line errors a stream the client is reading)
    const reader = stream.getReader()
    await expect(reader.read()).rejects.toThrow(/multi-line/)
  })
})

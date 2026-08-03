import { describe, expect, it } from 'bun:test'
import { parseSocketClientFrame, SOCKET_WIRE_LIMITS_DEFAULT } from '../src/socket.js'

/**
 * The wire ingress guard. Every case here is a frame a hostile client can send with three lines of browser JavaScript —
 * the SDK is not on the other end of this socket, so the union type guarantees nothing on its own.
 */
describe('parseSocketClientFrame', () => {
  it('accepts the frames the client SDK actually sends', () => {
    const frames = [
      { t: 'ping' },
      { t: 'claim', ticket: 'tk-1' },
      { t: 'discard', ticket: 'tk-1' },
      { t: 'close', cid: 'c-1' },
      { t: 'send', id: 'm-1', cid: 'c-1', handler: 'messageSendHandler' },
      { t: 'send', id: 'm-1', cid: 'c-1', handler: 'h', input: '{"text":"hi"}', room: '{"chatId":"5"}' },
      { t: 'join', id: 'j-1', cid: 'c-1', space: 'chatSpace', input: '{"chatId":"5"}' },
      { t: 'leave', cid: 'c-1', space: 'chatSpace', rooms: ['{"chatId":"5"}'] },
      { t: 'reply', id: 'm-1', cid: 'c-1', data: '{"ok":true}' },
      { t: 'reply', id: 'm-1', cid: 'c-1', error: '{"message":"nope"}' },
      { t: 'resume', entries: [{ cid: 'c-1', key: 'k-1', cursors: { c: 3 } }] },
    ]
    for (const frame of frames) {
      expect(parseSocketClientFrame(JSON.stringify(frame))).toEqual(frame as never)
    }
  })

  it('drops what is not a frame object at all', () => {
    // `null` is the one that used to throw: `JSON.parse('null').t` inside the ws message callback
    for (const message of ['null', '123', '"send"', '[]', '[{"t":"ping"}]', 'true', '', '{', 'undefined']) {
      expect(parseSocketClientFrame(message)).toBeUndefined()
    }
  })

  it('drops an unknown frame kind instead of throwing (a client one version ahead)', () => {
    expect(parseSocketClientFrame('{"t":"subscribe","cid":"c-1"}')).toBeUndefined()
    expect(parseSocketClientFrame('{"cid":"c-1"}')).toBeUndefined()
    expect(parseSocketClientFrame('{"t":42}')).toBeUndefined()
  })

  it('keeps unknown extra fields (the protocol has to survive a newer client)', () => {
    const frame = parseSocketClientFrame('{"t":"ping","future":{"nested":true}}')
    expect(frame).toEqual({ t: 'ping', future: { nested: true } } as never)
  })

  it('refuses a field that is not the type the union promises', () => {
    const hostile = [
      // an object where a connection id belongs — it would reach `connections.get()` and Map lookups downstream
      '{"t":"close","cid":{"$ne":null}}',
      '{"t":"close","cid":null}',
      '{"t":"close"}',
      // a number ticket lands in a backplane KV key by template interpolation
      '{"t":"claim","ticket":123}',
      '{"t":"discard","ticket":["a","b"]}',
      // a handler/space name must be a string — it keys the points lookup
      '{"t":"send","id":"m-1","cid":"c-1","handler":null}',
      '{"t":"send","id":"m-1","cid":"c-1","handler":{"toString":"x"}}',
      '{"t":"join","id":"j-1","cid":"c-1","space":7}',
      // payloads are transformer-serialized STRINGS, never objects
      '{"t":"send","id":"m-1","cid":"c-1","handler":"h","input":{"text":"hi"}}',
      '{"t":"send","id":"m-1","cid":"c-1","handler":"h","room":{"chatId":"5"}}',
      '{"t":"reply","id":"m-1","cid":"c-1","data":{"ok":true}}',
      // leave names an array OF STRINGS
      '{"t":"leave","cid":"c-1","space":"s","rooms":"{}"}',
      '{"t":"leave","cid":"c-1","space":"s","rooms":[{"chatId":"5"}]}',
      '{"t":"leave","cid":"c-1","space":"s"}',
      // resume offers an array of entries
      '{"t":"resume","entries":{"cid":"c-1"}}',
      '{"t":"resume"}',
    ]
    for (const message of hostile) {
      expect(parseSocketClientFrame(message)).toBeUndefined()
    }
  })

  it('refuses an empty id — it would key an entry that cannot exist', () => {
    expect(parseSocketClientFrame('{"t":"close","cid":""}')).toBeUndefined()
    expect(parseSocketClientFrame('{"t":"claim","ticket":""}')).toBeUndefined()
  })

  it('bounds the fan-out one frame may ask for', () => {
    const entry = { cid: 'c-1', key: 'k-1', cursors: {} }
    const atCap = {
      t: 'resume',
      entries: Array.from({ length: SOCKET_WIRE_LIMITS_DEFAULT.resumeEntries }, () => entry),
    }
    const overCap = {
      t: 'resume',
      entries: Array.from({ length: SOCKET_WIRE_LIMITS_DEFAULT.resumeEntries + 1 }, () => entry),
    }
    expect(parseSocketClientFrame(JSON.stringify(atCap))).toBeDefined()
    expect(parseSocketClientFrame(JSON.stringify(overCap))).toBeUndefined()

    const rooms = (count: number): string =>
      JSON.stringify({
        t: 'leave',
        cid: 'c-1',
        space: 's',
        rooms: Array.from({ length: count }, (_, index) => `r${index}`),
      })
    expect(parseSocketClientFrame(rooms(SOCKET_WIRE_LIMITS_DEFAULT.leaveRooms))).toBeDefined()
    expect(parseSocketClientFrame(rooms(SOCKET_WIRE_LIMITS_DEFAULT.leaveRooms + 1))).toBeUndefined()
  })

  it('bounds id and name lengths', () => {
    const long = (length: number): string => 'x'.repeat(length)
    expect(parseSocketClientFrame(`{"t":"close","cid":"${long(SOCKET_WIRE_LIMITS_DEFAULT.id)}"}`)).toBeDefined()
    expect(parseSocketClientFrame(`{"t":"close","cid":"${long(SOCKET_WIRE_LIMITS_DEFAULT.id + 1)}"}`)).toBeUndefined()
    const send = (name: string): string => `{"t":"send","id":"m-1","cid":"c-1","handler":"${name}"}`
    expect(parseSocketClientFrame(send(long(SOCKET_WIRE_LIMITS_DEFAULT.name)))).toBeDefined()
    expect(parseSocketClientFrame(send(long(SOCKET_WIRE_LIMITS_DEFAULT.name + 1)))).toBeUndefined()
  })

  it('does not let a payload key reach Object.prototype', () => {
    // JSON.parse keeps `__proto__` as an OWN property; what matters is that nothing here assigns it onward
    const frame = parseSocketClientFrame('{"t":"ping","__proto__":{"polluted":true}}')
    expect(frame).toBeDefined()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

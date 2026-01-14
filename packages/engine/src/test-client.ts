import type { FetchFn, PointsScope } from '@point0/core'
import { _getSsItemsWithRestErrors, _ssRunWithServerStorageState } from '@point0/core'
import type { ClientBun } from './client.js'
import type { Engine } from './engine.js'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'

export class FakeClient {
  id: string
  scope: PointsScope
  client: ClientBun<true>
  engine: Engine<any, true>
  jar: CookieJar
  fetch: FetchFn

  private constructor({
    engine,
    client,
    id,
    scope,
    jar,
    fetch,
  }: {
    engine: Engine<any, true>
    client: ClientBun<true>
    id: string
    scope: PointsScope
    jar: CookieJar
    fetch: FetchFn
  }) {
    this.engine = engine
    this.client = client
    this.id = id
    this.scope = scope
    this.jar = jar
    this.fetch = fetch
  }

  static create({ engine, scope }: { engine: Engine<any, true>; scope: PointsScope }): FakeClient {
    const client = engine.clients.find((client) => client.scope === scope)
    if (!client) {
      throw new Error(`No client found with scope "${scope}"`)
    }
    const id = crypto.randomUUID()
    const jar = new CookieJar()
    const fetch = fetchCookie(engine.fetchSimple.bind(engine), jar)
    return new FakeClient({ engine, client, id, scope, jar, fetch })
  }

  run<TResult>(fn: () => TResult): TResult {
    return _ssRunWithServerStorageState(
      _getSsItemsWithRestErrors(
        {
          __POINT0_FAKE_CLIENT__: this,
          __POINT0_REAL_SERVER_OVER_FAKE_CLIENT__: false,
          __POINT0_FETCH_FN__: this.fetch.bind(this),
          __POINT0_CLIENT_SCOPE__: this.scope,
        },
        'Not yet exists in test client run',
      ),
      fn,
    )
  }
}

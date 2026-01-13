import type { FetchFn, PointsScope } from '@point0/core'
import { _getSsItemsWithRestErrors, _ssRunWithServerStorageState } from '@point0/core'
import type { ClientBun } from './client.js'
import type { Engine } from './engine.js'
import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'

export class TestClient {
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

  static create({ engine, scope }: { engine: Engine<any, true>; scope: PointsScope }): TestClient {
    const client = engine.clients.find((client) => client.scope === scope)
    if (!client) {
      throw new Error(`No client found with scope "${scope}"`)
    }
    const id = crypto.randomUUID()
    const jar = new CookieJar()
    const fetch = fetchCookie(engine.fetchSimple.bind(engine), jar)
    return new TestClient({ engine, client, id, scope, jar, fetch })
  }

  run<TResult>(fn: () => TResult): TResult {
    return _ssRunWithServerStorageState(
      _getSsItemsWithRestErrors(
        {
          __POINT0_TEST_CLIENT__: this,
        },
        'Not yet exists in test client run',
      ),
      fn,
    )
  }
}

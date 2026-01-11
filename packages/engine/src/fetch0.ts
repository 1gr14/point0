import fetchCookie from 'fetch-cookie'
import { CookieJar } from 'tough-cookie'
import type { Engine } from './engine.js'
import type { FetchFn } from '@point0/core'

export class Fetch0 {
  engine: Engine
  jar: CookieJar
  fetch: FetchFn

  private constructor({ engine, jar, fetch }: { engine: Engine; jar: CookieJar; fetch: FetchFn }) {
    this.engine = engine
    this.jar = jar
    this.fetch = fetch
  }

  static create(engine: Engine): Fetch0 {
    const jar = new CookieJar()
    const baseFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      const req = input instanceof Request ? input : new Request(input, init)
      const res = await engine.fetch(req)
      if (!res) {
        throw new Error(
          'No response from engine. It basically means that dev server http upgraded, should never happen',
        )
      }
      return res
    }
    const finalFetch = fetchCookie(baseFetch, jar)
    return new Fetch0({ engine, jar, fetch: finalFetch })
  }

  static apply(engine: Engine): Fetch0 {
    const fetch0 = Fetch0.create(engine)
    fetch0.apply()
    return fetch0
  }

  apply() {
    for (const pm of this.engine.allPointsManagers.pointsManagers) {
      for (const point of pm.collection) {
        point.point._fetcher = this.fetch
      }
    }
  }
}

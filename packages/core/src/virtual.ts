export function createMock(path = 'mock'): any {
  const fn = () => {}

  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === '__esModule') return true
      if (prop === 'default') return createMock(path)
      if (prop === 'caller') return null
      if (prop === 'then') return (resolve: any) => Promise.resolve(resolve(createMock(path)))
      if (prop === 'catch') return () => Promise.resolve(createMock(path))
      if (prop === 'finally')
        return (f: any) => {
          f()
          return Promise.resolve(createMock(path))
        }
      if (typeof prop === 'symbol') return undefined
      return createMock(`${path}.${String(prop)}`)
    },
    apply() {
      return createMock(`${path}()`)
    },
    construct() {
      return createMock(`new ${path}`)
    },
    set() {
      return true
    },
  })
}

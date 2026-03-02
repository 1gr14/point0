if (typeof window === 'undefined') {
  throw new Error('It is client only code')
}

export const clientOnlyFn = () => {
  console.info('client only log')
}

export class CriticalCompilerError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CriticalCompilerError'
  }
}

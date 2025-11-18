import type { Routes } from '@devp0nt/route0'

export type GeneratorOptions = {
  banner?: string
  routes?: Routes | string
  glob: string | string[]
  ready?: string
  lazy?: string
  // wouterRoutes?: string
  cwd: string
}

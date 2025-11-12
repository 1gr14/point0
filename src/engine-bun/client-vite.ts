import type { Points } from '../core/points.js'
import type { EngineClientOptionsParsed } from '../engine-shared/config.js'

export class ClientVite {
  points: Points

  private constructor(input: { points: Points }) {
    this.points = input.points
  }

  static create(input: EngineClientOptionsParsed): ClientVite {
    return new ClientVite(input)
  }
}

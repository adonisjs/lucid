/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { BaseTransformer } from '@adonisjs/core/transformers'

export function defineTransformerBindings(Transformer: typeof BaseTransformer) {
  Transformer.prototype.withCount = function (relationship) {
    const alias = `${relationship}_count`
    const aggregateValue = this.resource.$extras?.[alias]
    if (aggregateValue === undefined) {
      throw new Error(
        `Cannot transform undefined value. Use "this.whenCounted(relationship)" to allow undefined values`
      )
    }
    return Number(aggregateValue)
  }

  Transformer.prototype.withAggregate = function (alias) {
    const aggregateValue = this.resource.$extras?.[alias]
    if (aggregateValue === undefined) {
      throw new Error(
        `Cannot transform undefined value. Use "this.whenAggregated(alias)" to allow undefined values`
      )
    }
    return Number(aggregateValue)
  }

  Transformer.prototype.whenCounted = function (relationship) {
    const alias = `${relationship}_count`
    return this.whenAggregated(alias)
  }

  Transformer.prototype.whenAggregated = function (alias) {
    const aggregateValue = this.resource.$extras?.[alias]
    if (aggregateValue === undefined) {
      return undefined
    }
    return Number(aggregateValue)
  }
}

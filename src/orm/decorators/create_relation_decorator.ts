/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { LucidModel } from '../../types/model.js'
import type { ModelRelationTypes } from '../../types/relations.js'

/**
 * Utility to create a custom relation decorator.
 * Useful for third-party packages that want to add custom relation types.
 *
 * @example
 * ```ts
 * // In your package
 * export const myRelation: MyRelationDecoratorType = createRelationDecorator(
 *   'myRelation'
 * )
 *
 * // Usage
 * class SomeModel extends BaseModel {
 *   @myRelation(() => SomeModel, { ...someOptions })
 *   declare someRelation: MyRelation<typeof SomeModel>
 * }
 * ```
 */
export function createRelationDecorator<
  TRelationType extends ModelRelationTypes['__opaque_type'] = ModelRelationTypes['__opaque_type'],
  TOptions = any,
>(
  relationType: TRelationType
): (relatedModel: () => LucidModel, options?: TOptions) => PropertyDecorator {
  return function decorator(relatedModel, options?) {
    return function decorateAsRelation(target, property: string | symbol) {
      const Model = target.constructor as LucidModel
      Model.boot()
      const propertyName = typeof property === 'symbol' ? property.toString() : property
      Model.$addRelation(
        propertyName,
        relationType,
        relatedModel,
        Object.assign({ relatedModel }, options) as any
      )
    }
  }
}

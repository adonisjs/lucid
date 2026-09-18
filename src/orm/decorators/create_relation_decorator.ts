/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DecoratorFn, LucidModel } from '../../types/model.js'
import type { ModelRelationTypes } from '../../types/relations.js'

/**
 * Utility to create a relation decorator. Useful for third-party packages that
 * register custom relation types.
 *
 * @example
 * ```ts
 * // In your package
 * export const morphTo: MorphToDecorator = createRelationDecorator('morphTo')
 *
 * // Usage
 * class Comment extends BaseModel {
 *   @morphTo(() => Post, { morphType: 'commentable_type' })
 *   declare commentable: MorphTo<typeof Post>
 * }
 * ```
 */
export function createRelationDecorator<
  RelationType extends ModelRelationTypes['__opaque_type'] = ModelRelationTypes['__opaque_type'],
  Options = any,
>(relationType: RelationType): (relatedModel: () => LucidModel, options?: Options) => DecoratorFn {
  return function decorator(relatedModel, options?) {
    return function decorateAsRelation(target, property: string) {
      const Model = target.constructor as LucidModel
      Model.boot()
      Model.$addRelation(
        property,
        relationType,
        relatedModel,
        Object.assign({ relatedModel }, options) as any
      )
    }
  }
}

/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { ModelConstructorContract, AvailableRelations } from '@ioc:Adonis/Lucid/Model'

/**
 * Value to return when relationship is not preloaded
 * with the model instance.
 *
 * We are re-using the defaults from a static source to avoid creating empty arrays
 * everytime someone access the relationship. However, as a downside, if someone
 * decides to mutate the array, that will mutate the source and hence we
 * freeze the arrays.
 *
 * The `Object.freeze` however doesn't stop one from defining values for a specific
 * index.
 */
const DEFAULTS: {
  [P in AvailableRelations]: any
} = {
  hasOne: null,
  hasMany: Object.freeze([]),
  belongsTo: null,
  // hasOneThrough: null,
  manyToMany: Object.freeze([]),
  // hasManyThrough: Object.freeze([]),
}

/**
 * A proxy trap to add support for custom getters and setters
 */
export const proxyHandler = {
  get (target: any, key: any, receiver: any) {
    const Model = target.constructor as ModelConstructorContract
    const column = Model.$getColumn(key)

    /**
     * Fetch the attribute value, when attribute exists and
     * doesn't have a getter
     */
    if (column && !column.hasGetter) {
      return target.$getAttribute(key)
    }

    /**
     * Fetch the relation when property is defined as a relationship
     */
    const relation = Model.$getRelation(key)
    if (relation) {
      return target.$getRelated(key, DEFAULTS[relation.type])
    }

    return Reflect.get(target, key, receiver)
  },

  set (target: any, key: any, value: any, receiver) {
    const Model = target.constructor as ModelConstructorContract
    const column = Model.$getColumn(key)

    /**
     * Set value as an attribute when column is defined and
     * their isn't any setter for it.
     */
    if (column && !column.hasSetter) {
      target.$setAttribute(key, value)
      return true
    }

    /**
     * Fetch the relation when property is defined as a relationship
     */
    const relation = Model.$getRelation(key)
    if (relation) {
      throw new Exception('Cannot set relationships locally', 500, 'E_CANNOT_DEFINE_RELATIONSHIP')
    }

    return Reflect.set(target, key, value, receiver)
  },
}

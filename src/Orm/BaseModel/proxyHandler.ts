/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import { LucidModel } from '@ioc:Adonis/Lucid/Model'

/**
 * A proxy trap to add support for custom getters and setters
 */
export const proxyHandler = {
  get (target: any, key: any, receiver: any) {
    const Model = target.constructor as LucidModel
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
      return target.$getRelated(key)
    }

    return Reflect.get(target, key, receiver)
  },

  set (target: any, key: any, value: any, receiver: any) {
    const Model = target.constructor as LucidModel
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
      target.$setRelated(key, value)
      return true
    }

    return Reflect.set(target, key, value, receiver)
  },
}

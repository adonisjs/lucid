/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { BaseModel } from './model.js'
import * as errors from '../errors.js'

export const proxyHandler = {
  get(target: BaseModel, key: any, receiver: any) {
    const Model = target.constructor as typeof BaseModel
    if (Model.preventAccessingMissingAttributes && !Reflect.has(target, key)) {
      throw new errors.E_MISSING_MODEL_PROPERTY([Model.name, key])
    }
    return Reflect.get(target, key, receiver)
  },

  set(target: BaseModel, key: any, value: any, receiver: any) {
    const Model = target.constructor as typeof BaseModel
    const column = Model.getAttribute(key)

    /**
     * Set value as an attribute when column is defined and
     * their isn't any setter for it.
     */
    if (column && !column.hasSetter) {
      target.setAttribute(key, value)
    }

    return Reflect.set(target, key, value, receiver)
  },

  defineProperty(target: BaseModel, key: any, value: any) {
    const Model = target.constructor as typeof BaseModel
    const column = Model.getAttribute(key)

    /**
     * Set the attribute alongside defining the property
     */
    if (column && !column.hasSetter && value.value !== undefined) {
      target.setAttribute(key, value.value)
    }

    return Reflect.defineProperty(target, key, value)
  },
}

/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { Exception } from '@poppinss/utils'
import { RelationContract, ModelContract } from '@ioc:Adonis/Lucid/Model'

/**
 * Ensure that relation is defined
 */
export function ensureRelation<T extends RelationContract> (
  name: string,
  relation?: T,
): relation is T {
  if (!relation) {
    throw new Exception(`Cannot process unregistered relationship ${name}`, 500)
  }

  return true
}

/**
 * Returns the value for a key from the model instance and raises descriptive
 * exception when the value is missing
 */
export function getValue (
  model: ModelContract,
  key: string,
  relation: RelationContract,
  action = 'preload',
) {
  const value = model[key]

  if (value === undefined) {
    throw new Exception(
      `Cannot ${action} ${relation.relationName}, value of ${relation.model.name}.${key} is undefined`,
      500,
    )
  }

  return value
}

export function isObject (value: any): boolean {
  return value !== null && typeof (value) === 'object' && !Array.isArray(value)
}

export function unique (value: any[]) {
  if (!Array.isArray(value)) {
    return []
  }
  return [...new Set(value)]
}

export function difference (main: any[], other: []) {
  return [main, other].reduce((a, b) => a.filter(c => !b.includes(c)))
}

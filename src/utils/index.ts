/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import { extname } from 'path'
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

  if (value === undefined || value === null) {
    throw new Exception(
      `Cannot ${action} ${relation.relationName}, value of ${relation.model.name}.${key} is undefined`,
      500,
    )
  }

  return value
}

/**
 * Helper to find if value is a valid Object or
 * not
 */
export function isObject (value: any): boolean {
  return value !== null && typeof (value) === 'object' && !Array.isArray(value)
}

/**
 * Drops duplicate values from an array
 */
export function unique (value: any[]) {
  if (!Array.isArray(value)) {
    return []
  }
  return [...new Set(value)]
}

/**
 * Finds the diff between 2 arrays
 */
export function difference (main: any[], other: []) {
  return [main, other].reduce((a, b) => {
    return a.filter(c => {
      /* eslint eqeqeq: "off" */
      return !b.find((one) => c == one)
    })
  })
}

/**
 * A helper to know file ends with a script file
 * extension or not
 */
export function isJavaScriptFile (file: string) {
  return ['.js', '.ts'].includes(extname(file))
}

/**
 * Returns a diff of rows to be updated or inserted when performing
 * a many to many `attach`
 */
export function syncDiff (
  dbRows: any[],
  attributesToSync: any[] | { [key: string]: any },
  rowIdResolver: (rows: any, forId: string) => any,
) {
  /**
   * When attributes to sync are not defined as an array. Then we expect it
   * to be an object
   */
  const hasExtraAttributes = !Array.isArray(attributesToSync)

  /**
   * An array of ids we want to sync
   */
  const idsToSync = (hasExtraAttributes ? Object.keys(attributesToSync) : attributesToSync) as string[]

  return idsToSync.reduce((result: { insert: any[], update: any[] }, id) => {
    /**
     * Find the matching row for the given id
     */
    const matchingRow = rowIdResolver(dbRows, id)

    /**
     * When there isn't any matching row, we need to insert
     * the id
     */
    if (!matchingRow) {
      result.insert.push(id)
      return result
    }

    /**
     * When there aren't any extra attributes to check, we skip the
     * given id, since it already exists.
     */
    if (!hasExtraAttributes) {
      return result
    }

    /**
     * When one or more attributes inside the update payload are different
     * from the actual row, then we perform an update
     */
    const attributes = attributesToSync[id]
    /* eslint eqeqeq: "off" */
    if (Object.keys(attributes).find((key) => matchingRow[key] != attributes[key])) {
      result.update.push(id)
    }

    return result
  }, { insert: [], update: [] })
}

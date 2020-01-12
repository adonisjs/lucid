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
import { ModelContract, ModelObject } from '@ioc:Adonis/Lucid/Model'
import { RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'
import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

/**
 * Ensure that relation is defined
 */
export function ensureRelation<T extends RelationshipsContract> (
  name: string,
  relation?: T,
): relation is T {
  if (!relation) {
    throw new Exception(`Cannot process unregistered relationship ${name}`, 500)
  }

  return true
}

/**
 * Ensure a key value is not null or undefined inside an object.
 */
export function ensureValue (collection: any, key: string, missingCallback: () => void) {
  const value = collection[key]
  if (value === undefined || value === null) {
    missingCallback()
    return
  }

  return value
}

/**
 * Raises exception when a relationship `booted` property is false.
 */
export function ensureRelationIsBooted (relation: RelationshipsContract) {
  if (!relation.booted) {
    throw new Exception(
      'Relationship is not booted. Make sure to call boot first',
      500,
      'E_RUNTIME_EXCEPTION',
    )
  }
}

/**
 * Returns the value for a key from the model instance and raises descriptive
 * exception when the value is missing
 */
export function getValue (
  model: ModelContract,
  key: string,
  relation: RelationshipsContract,
  action = 'preload',
) {
  return ensureValue(model, key, () => {
    throw new Exception(
      `Cannot ${action} "${relation.relationName}", value of "${relation.model.name}.${key}" is undefined`,
      500,
    )
  })
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
      /* eslint-disable-next-line eqeqeq */
      return !b.find((one) => c == one)
    })
  })
}

/**
 * Returns a diff of rows to be updated or inserted when performing
 * a many to many `attach`
 */
export function syncDiff (original: ModelObject, incoming: ModelObject) {
  const diff = Object
    .keys(incoming)
    .reduce<{ added: ModelObject, updated: ModelObject, removed: ModelObject }>((
    result,
    incomingRowId,
  ) => {
    const originalRow = original[incomingRowId]

    /**
     * When there isn't any matching row, we need to insert
     * the upcoming row
     */
    if (!originalRow) {
      result.added[incomingRowId] = incoming[incomingRowId]
    } else if (Object.keys(incoming[incomingRowId]).find((key) => incoming[incomingRowId][key] !== originalRow[key])) {
      /**
       * If any of the row attributes are different, then we must
       * update that row
       */
      result.updated[incomingRowId] = incoming[incomingRowId]
    }

    return result
  }, { added: {}, updated: {}, removed: {} })

  /**
   * Deleted rows
   */
  diff.removed = Object.keys(original).reduce((result, originalRowId) => {
    if (!incoming[originalRowId]) {
      result[originalRowId] = {}
    }
    return result
  }, {})

  return diff
}

/**
 * Invokes a callback by wrapping it inside managed transaction
 * when passed client is not transaction itself.
 */
export async function managedTransaction<T> (
  client: QueryClientContract | TransactionClientContract,
  callback: (trx: TransactionClientContract) => Promise<T>,
): Promise<T> {
  const isManagedTransaction = !client.isTransaction
  const trx = client.isTransaction ? client as TransactionClientContract : await client.transaction()

  if (!isManagedTransaction) {
    return callback(trx)
  }

  try {
    const response = await callback(trx)
    await trx.commit()
    return response
  } catch (error) {
    await trx.rollback()
    throw error
  }
}

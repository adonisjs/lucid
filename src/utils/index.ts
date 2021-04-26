/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { join, extname } from 'path'
import { Exception, esmRequire } from '@poppinss/utils'
import { fsReadAll, resolveDir } from '@poppinss/utils/build/helpers'
import { RelationshipsContract } from '@ioc:Adonis/Lucid/Relations'
import { LucidRow, ModelObject, CherryPickFields } from '@ioc:Adonis/Lucid/Model'
import {
  QueryClientContract,
  TransactionClientContract,
  FileNode,
} from '@ioc:Adonis/Lucid/Database'

/**
 * Ensure that relation is defined
 */
export function ensureRelation<T extends RelationshipsContract>(
  name: string,
  relation?: T
): relation is T {
  if (!relation) {
    throw new Exception(`Cannot process unregistered relationship ${name}`, 500)
  }

  return true
}

/**
 * Ensure a key value is not null or undefined inside an object.
 */
export function ensureValue(collection: any, key: string, missingCallback: () => void) {
  const value = collection[key]
  if (value === undefined || value === null) {
    missingCallback()
    return
  }

  return value
}

/**
 * Collects values for a key inside an array. Similar to `Array.map`, but
 * reports missing values.
 */
export function collectValues(payload: any[], key: string, missingCallback: () => void) {
  return payload.map((row: any) => {
    return ensureValue(row, key, missingCallback)
  })
}

/**
 * Raises exception when a relationship `booted` property is false.
 */
export function ensureRelationIsBooted(relation: RelationshipsContract) {
  if (!relation.booted) {
    throw new Exception(
      'Relationship is not booted. Make sure to call boot first',
      500,
      'E_RUNTIME_EXCEPTION'
    )
  }
}

/**
 * Returns the value for a key from the model instance and raises descriptive
 * exception when the value is missing
 */
export function getValue(
  model: LucidRow | ModelObject,
  key: string,
  relation: RelationshipsContract,
  action = 'preload'
) {
  return ensureValue(model, key, () => {
    throw new Exception(
      `Cannot ${action} "${relation.relationName}", value of "${relation.model.name}.${key}" is undefined`,
      500
    )
  })
}

/**
 * Helper to find if value is a valid Object or
 * not
 */
export function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Drops duplicate values from an array
 */
export function unique(value: any[]) {
  if (!Array.isArray(value)) {
    return []
  }
  return [...new Set(value)]
}

/**
 * Returns a diff of rows to be updated or inserted when performing
 * a many to many `attach`
 */
export function syncDiff(original: ModelObject, incoming: ModelObject) {
  const diff = Object.keys(incoming).reduce<{ added: ModelObject; updated: ModelObject }>(
    (result, incomingRowId) => {
      const originalRow = original[incomingRowId]
      const incomingRow = incoming[incomingRowId]

      /**
       * When there isn't any matching row, we need to insert
       * the upcoming row
       */
      if (!originalRow) {
        result.added[incomingRowId] = incomingRow
      } else if (Object.keys(incomingRow).find((key) => incomingRow[key] !== originalRow[key])) {
        /**
         * If any of the row attributes are different, then we must
         * update that row
         */
        result.updated[incomingRowId] = incomingRow
      }

      return result
    },
    { added: {}, updated: {} }
  )

  return diff
}

/**
 * Invokes a callback by wrapping it inside managed transaction
 * when passed client is not transaction itself.
 */
export async function managedTransaction<T>(
  client: QueryClientContract | TransactionClientContract,
  callback: (trx: TransactionClientContract) => Promise<T>
): Promise<T> {
  const isManagedTransaction = !client.isTransaction
  const trx = client.isTransaction
    ? (client as TransactionClientContract)
    : await client.transaction()

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

/**
 * Returns the sql method for a DDL statement
 */
export function getDDLMethod(sql: string) {
  if (sql.startsWith('create')) {
    return 'create'
  }

  if (sql.startsWith('alter')) {
    return 'alter'
  }

  if (sql.startsWith('drop')) {
    return 'drop'
  }

  return 'unknown'
}

/**
 * Normalizes the cherry picking object to always be an object with
 * `pick` and `omit` properties
 */
export function normalizeCherryPickObject(fields: CherryPickFields) {
  if (Array.isArray(fields)) {
    return {
      pick: fields,
      omit: [],
    }
  }

  return {
    pick: fields.pick,
    omit: fields.omit,
  }
}

/**
 * Sources files from a given directory
 */
export function sourceFiles(
  fromLocation: string,
  directory: string
): Promise<{ directory: string; files: FileNode<unknown>[] }> {
  return new Promise((resolve, reject) => {
    const path = resolveDir(fromLocation, directory)
    const files = fsReadAll(path)
    try {
      resolve({
        directory,
        files: files.sort().map((file: string) => {
          return {
            filename: file,
            absPath: join(path, file),
            name: join(directory, file.replace(RegExp(`${extname(file)}$`), '')),
            getSource() {
              return esmRequire(this.absPath)
            },
          }
        }),
      })
    } catch (error) {
      reject(error)
    }
  })
}

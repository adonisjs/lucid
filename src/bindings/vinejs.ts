/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine, { VineString } from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import type { Database } from '../database/main.js'

/**
 * The callback function to check a row inside the database
 */
type DatabaseRowChecker = (db: Database, value: string, field: FieldContext) => Promise<boolean>

declare module '@vinejs/vine' {
  export interface VineString {
    /**
     * Ensure the value is unique inside the database by self
     * executing a query.
     *
     * - The callback must return "true", if the value is unique (does not exist).
     * - The callback must return "false", if the value is not unique (already exists).
     */
    unique(callback: DatabaseRowChecker): this

    /**
     * Ensure the value is exists inside the database by self
     * executing a query.
     *
     * - The callback must return "true", if the value exists.
     * - The callback must return "false", if the value does not exist.
     */
    exists(callback: DatabaseRowChecker): this
  }
}

/**
 * Defines the "unique" and "exists" validation rules with
 * VineJS.
 */
export function defineValidationRules(db: Database) {
  const uniqueRule = vine.createRule<DatabaseRowChecker>(
    async (value, optionsOrCallback, field) => {
      if (!field.isValid) {
        return
      }

      const isUnqiue = await optionsOrCallback(db, value as string, field)
      if (!isUnqiue) {
        field.report('The {{ field }} has already been taken', 'database.unique', field)
      }
    }
  )

  const existsRule = vine.createRule<DatabaseRowChecker>(
    async (value, optionsOrCallback, field) => {
      if (!field.isValid) {
        return
      }

      const exists = await optionsOrCallback(db, value as string, field)
      if (!exists) {
        field.report('The selected {{ field }} is invalid', 'database.exists', field)
      }
    }
  )

  VineString.macro('unique', function (this: VineString, optionsOrCallback) {
    return this.use(uniqueRule(optionsOrCallback))
  })
  VineString.macro('exists', function (this: VineString, optionsOrCallback) {
    return this.use(existsRule(optionsOrCallback))
  })
}

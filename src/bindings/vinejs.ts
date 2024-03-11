/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import vine, { VineNumber, VineString } from '@vinejs/vine'
import type { Database } from '../database/main.js'
import type { DatabaseQueryBuilderContract } from '../types/querybuilder.js'
import type { FieldContext } from '@vinejs/vine/types'

/**
 * Defines the "uniqueRaw", "unique" and "exists" validation rules with
 * VineJS.
 */
export function defineValidationRules(db: Database) {
  const uniqueRawRule = vine.createRule<
    Parameters<VineString['uniqueRaw'] | VineNumber['uniqueRaw']>[0]
  >(async (value, checker, field) => {
    if (!field.isValid) {
      return
    }

    const isUnique = await checker(db, value as string, field)
    if (!isUnique) {
      field.report('The {{ field }} has already been taken', 'database.unique', field)
    }
  })

  const uniqueRule = vine.createRule<{
    table: string
    column?: string
    filter?: (
      db: DatabaseQueryBuilderContract,
      value: unknown,
      field: FieldContext
    ) => Promise<void>
  }>(async (value, { table, column, filter }, field) => {
    if (!field.isValid) {
      return
    }

    if (typeof value !== 'string') {
      return
    }

    if (typeof field.name !== 'string') {
      return
    }

    const columnName = column ?? field.name
    const baseQuery = db.from(table).select(columnName).where(columnName, value)
    await filter?.(baseQuery, value, field)
    const row = await baseQuery.first()
    if (row) {
      field.report('The {{ field }} has already been taken', 'database.unique', field)
    }
  })

  const existsRule = vine.createRule<Parameters<VineString['exists'] | VineNumber['exists']>[0]>(
    async (value, checker, field) => {
      if (!field.isValid) {
        return
      }

      const exists = await checker(db, value as string, field)
      if (!exists) {
        field.report('The selected {{ field }} is invalid', 'database.exists', field)
      }
    }
  )

  VineString.macro('uniqueRaw', function (this: VineString, checker) {
    return this.use(uniqueRawRule(checker))
  })
  VineString.macro('unique', function (this: VineString, table, column, filter) {
    return this.use(uniqueRule({ table, column, filter }))
  })
  VineString.macro('exists', function (this: VineString, checker) {
    return this.use(existsRule(checker))
  })
  VineNumber.macro('uniqueRaw', function (this: VineNumber, checker) {
    return this.use(uniqueRawRule(checker))
  })
  VineNumber.macro('unique', function (this: VineNumber, table, column, filter) {
    return this.use(uniqueRule({ table, column, filter }))
  })
  VineNumber.macro('exists', function (this: VineNumber, checker) {
    return this.use(existsRule(checker))
  })
}

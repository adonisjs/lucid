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
import type { FieldContext } from '@vinejs/vine/types'
import { DatabaseQueryBuilderContract } from '../types/querybuilder.js'

/**
 * Defines the "unique" and "exists" validation rules with
 * VineJS.
 */
export function defineValidationRules(db: Database) {
  const uniqueRule = vine.createRule<
    | ((db: Database, value: string, field: FieldContext) => Promise<boolean>)
    | {
        table: string
        column?: string
        filter?: (
          db: DatabaseQueryBuilderContract,
          value: unknown,
          field: FieldContext
        ) => Promise<void>
      }
  >(async (value, checkerOrOptions, field) => {
    if (!field.isValid) {
      return
    }

    if (typeof checkerOrOptions === 'function') {
      const isUnique = await checkerOrOptions(db, value as string, field)
      if (!isUnique) {
        field.report('The {{ field }} has already been taken', 'database.unique', field)
      }
      return
    }

    if (typeof value !== 'string') {
      return
    }

    if (typeof field.name !== 'string') {
      return
    }

    const { table, column = field.name, filter } = checkerOrOptions
    const baseQuery = db.from(table).select(column).where(column, value)
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

  VineString.macro('unique', function (this: VineString, checkerOrOptions) {
    return this.use(uniqueRule(checkerOrOptions))
  })
  VineString.macro('exists', function (this: VineString, checker) {
    return this.use(existsRule(checker))
  })
  VineNumber.macro('unique', function (this: VineNumber, checkerOrOptions) {
    return this.use(uniqueRule(checkerOrOptions))
  })
  VineNumber.macro('exists', function (this: VineNumber, checker) {
    return this.use(existsRule(checker))
  })
}

/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import {
  type LucidModel,
  type EncryptedColumnMeta,
  type ModelColumnOptions,
} from '../../types/model.js'
import { type Dictionary } from '../../types/querybuilder.js'
import { isObject } from '../../utils/index.js'
import { Chainable } from '../../database/query_builder/chainable.js'
import * as errors from '../../errors.js'

type EncryptedQueryColumn = {
  key: string
  attributeName: string
  columnName: string
  encryption: EncryptedColumnMeta
}

type EncryptedWhereArgs = [any] | [any, any] | [any, any, any]

export type EncryptedWhereMethod = 'where' | 'orWhere' | 'whereNot' | 'orWhereNot'
export type EncryptedWhereInMethod = 'whereIn' | 'orWhereIn' | 'whereNotIn' | 'orWhereNotIn'

export type EncryptedWhereRewrite =
  | {
      target: 'where'
      method: EncryptedWhereMethod
      args: EncryptedWhereArgs
    }
  | {
      target: 'whereIn'
      method: EncryptedWhereInMethod
      columns: any
      value: any
    }

export type EncryptedWhereInRewrite = {
  method: EncryptedWhereInMethod
  columns: any
  value: any
}

/**
 * Encapsulates encrypted-column query rewriting and write payload preparation.
 */
export class EncryptedQuerySupport {
  readonly #model: LucidModel
  readonly #getTableAlias: () => string | undefined

  constructor(model: LucidModel, getTableAlias: () => string | undefined = () => undefined) {
    this.#model = model
    this.#getTableAlias = getTableAlias
  }

  rewriteWhereTernary(
    method: EncryptedWhereMethod,
    key: string,
    operator: any,
    value: any
  ): EncryptedWhereRewrite {
    const column = this.#getEncryptedQueryColumn(key, true)
    this.#ensureStandardEncryptedQuerySupport(column, method)

    const inOperatorRewrite = this.#rewriteInOperator(method, key, operator, value)
    if (inOperatorRewrite) {
      return {
        target: 'whereIn',
        ...inOperatorRewrite,
      }
    }

    this.#ensureEncryptedEqualityOperator(column, operator, method)

    if (column?.encryption.mode === 'blind') {
      const encryptedValues = this.#getEncryptedQueryValues(column, value)
      const encryptedKey = this.#getEncryptedQueryKey(column)
      const whereInMethod = this.#getEncryptedWhereInMethod(method)

      if (encryptedValues.length > 1) {
        return {
          target: 'whereIn',
          method: whereInMethod,
          columns: encryptedKey,
          value: encryptedValues,
        }
      }

      return this.#toWhereCall(method, encryptedKey, operator, encryptedValues[0])
    }

    return this.#toWhereCall(
      method,
      column ? this.#getEncryptedQueryKey(column) : key,
      operator,
      column ? this.#getEncryptedQueryValue(column, value) : value
    )
  }

  rewriteWhereBinary(method: EncryptedWhereMethod, key: string, value: any): EncryptedWhereRewrite {
    const column = this.#getEncryptedQueryColumn(key, true)
    this.#ensureStandardEncryptedQuerySupport(column, method)

    if (column?.encryption.mode === 'blind') {
      const encryptedValues = this.#getEncryptedQueryValues(column, value)
      const encryptedKey = this.#getEncryptedQueryKey(column)
      const whereInMethod = this.#getEncryptedWhereInMethod(method)

      if (encryptedValues.length > 1) {
        return {
          target: 'whereIn',
          method: whereInMethod,
          columns: encryptedKey,
          value: encryptedValues,
        }
      }

      return this.#toWhereCall(method, encryptedKey, encryptedValues[0])
    }

    return this.#toWhereCall(
      method,
      column ? this.#getEncryptedQueryKey(column) : key,
      column ? this.#getEncryptedQueryValue(column, value) : value
    )
  }

  rewriteWhereIn(
    method: EncryptedWhereInMethod,
    columns: any,
    value: any
  ): EncryptedWhereInRewrite {
    if (typeof columns !== 'string') {
      return {
        method,
        columns,
        value,
      }
    }

    const column = this.#getEncryptedQueryColumn(columns, true)
    this.#ensureStandardEncryptedQuerySupport(column, method)

    if (!column) {
      return {
        method,
        columns,
        value,
      }
    }

    const transformedValue = Array.isArray(value)
      ? value.flatMap((item) => this.#getEncryptedQueryValues(column, item))
      : this.#isQueryBuilderValue(value)
        ? value
        : this.#getEncryptedQueryValues(column, value)

    return {
      method,
      columns: this.#getEncryptedQueryKey(column),
      value: transformedValue,
    }
  }

  ensureMethodSupport(key: any, method: string) {
    const column = this.#getEncryptedQueryColumn(key, true)
    if (column) {
      this.#raiseUnsupportedEncryptedColumn(method, column)
    }
  }

  ensureColumnComparisonSupport(method: string, column: any, comparisonColumn: any) {
    this.ensureMethodSupport(column, method)
    this.ensureMethodSupport(comparisonColumn, method)
  }

  ensureArithmeticSupport(key: any, method: string) {
    const keys = typeof key === 'string' ? [key] : isObject(key) ? Object.keys(key) : []

    for (const columnKey of keys) {
      this.ensureMethodSupport(columnKey, method)
    }
  }

  prepareUpdateValues(
    values: Dictionary<any, string>,
    resolveKey: (key: string) => string,
    transformRaw: (value: any) => any
  ): Dictionary<any, string> {
    const result: Dictionary<any, string> = {}
    const blindWrites: Array<{ value: any; column: EncryptedQueryColumn }> = []

    for (const [key, value] of Object.entries(values)) {
      const column = this.#getEncryptedQueryColumn(key, true)
      if (!column) {
        result[resolveKey(key)] = transformRaw(value)
        continue
      }

      result[resolveKey(key)] = transformRaw(this.#getEncryptedWriteValue(column, value))

      if (column.encryption.mode === 'blind') {
        blindWrites.push({ value, column })
      }
    }

    /**
     * Apply blind writes after processing the original payload so computed indexes
     * always win over any manually provided blind column value, regardless of key order.
     */
    for (const { value, column } of blindWrites) {
      const blindResult = this.#getBlindWriteValue(column, value)
      if (blindResult.shouldWrite) {
        result[resolveKey(this.#getEncryptedQueryKey(column))] = transformRaw(blindResult.value)
      }
    }

    return result
  }

  #toWhereCall(
    method: EncryptedWhereMethod,
    key: any,
    operator?: any,
    value?: any
  ): EncryptedWhereRewrite {
    if (value !== undefined) {
      return {
        target: 'where',
        method,
        args: [key, operator, value],
      }
    }

    if (operator !== undefined) {
      return {
        target: 'where',
        method,
        args: [key, operator],
      }
    }

    return {
      target: 'where',
      method,
      args: [key],
    }
  }

  #rewriteInOperator(
    method: EncryptedWhereMethod,
    key: string,
    operator: any,
    value: any
  ): EncryptedWhereInRewrite | null {
    const column = this.#getEncryptedQueryColumn(key)
    if (!column) {
      return null
    }

    const normalizedOperator = this.#normalizeOperator(operator)
    if (!this.#isInOperator(normalizedOperator) && !this.#isNotInOperator(normalizedOperator)) {
      return null
    }

    const whereInMethod = this.#getEncryptedWhereInMethod(method)
    const targetMethod = this.#isInOperator(normalizedOperator)
      ? whereInMethod
      : this.#getOppositeEncryptedWhereInMethod(whereInMethod)

    return this.rewriteWhereIn(targetMethod, key, value)
  }

  #getEncryptedWhereInMethod(method: EncryptedWhereMethod): EncryptedWhereInMethod {
    switch (method) {
      case 'where':
        return 'whereIn'
      case 'orWhere':
        return 'orWhereIn'
      case 'whereNot':
        return 'whereNotIn'
      case 'orWhereNot':
        return 'orWhereNotIn'
    }
  }

  #getOppositeEncryptedWhereInMethod(method: EncryptedWhereInMethod): EncryptedWhereInMethod {
    switch (method) {
      case 'whereIn':
        return 'whereNotIn'
      case 'orWhereIn':
        return 'orWhereNotIn'
      case 'whereNotIn':
        return 'whereIn'
      case 'orWhereNotIn':
        return 'orWhereIn'
    }
  }

  #getEncryptedQueryColumn(
    key: any,
    includeStandard: boolean = false
  ): EncryptedQueryColumn | null {
    if (typeof key !== 'string') {
      return null
    }

    const lastDot = key.lastIndexOf('.')
    const normalizedKey = lastDot >= 0 ? key.slice(lastDot + 1) : key

    if (lastDot >= 0) {
      const source = key.slice(0, lastDot)
      if (!this.#isModelColumnSource(source)) {
        return null
      }
    }

    const attributeName =
      this.#model.$keys.columnsToAttributes.get(normalizedKey) ??
      this.#model.$keys.columnsToAttributes.get(key) ??
      normalizedKey

    if (!this.#model.$hasColumn(attributeName)) {
      return null
    }

    const column = this.#model.$getColumn(attributeName) as ModelColumnOptions
    if (!this.#isModelColumnReference(normalizedKey, attributeName, column.columnName)) {
      return null
    }

    const encryption = column.meta?.encryption as EncryptedColumnMeta | undefined
    if (!encryption || (!includeStandard && encryption.mode === 'standard')) {
      return null
    }

    return {
      key,
      attributeName,
      columnName: column.columnName,
      encryption,
    }
  }

  #isModelColumnSource(source: string): boolean {
    if (source === this.#model.table || source.endsWith(`.${this.#model.table}`)) {
      return true
    }

    const tableAlias = this.#getTableAlias()
    if (tableAlias && (source === tableAlias || source.endsWith(`.${tableAlias}`))) {
      return true
    }

    return false
  }

  #isModelColumnReference(column: string, attributeName: string, columnName: string): boolean {
    return column === attributeName || column === columnName
  }

  #isQueryBuilderValue(value: any): boolean {
    if (value instanceof Chainable || typeof value === 'function') {
      return true
    }

    return !!value && typeof value === 'object' && ('knexQuery' in value || 'toKnex' in value)
  }

  #getEncryptedQueryKey(column: EncryptedQueryColumn): string {
    if (column.encryption.mode !== 'blind') {
      return column.key
    }

    const blindColumnName = column.encryption.blindColumnName
    if (!blindColumnName) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        `${this.#model.name}.${column.attributeName}`,
        'Missing "blind.columnName"',
      ])
    }

    if (column.key === column.attributeName || column.key === column.columnName) {
      return blindColumnName
    }

    if (
      column.key.endsWith(`.${column.attributeName}`) ||
      column.key.endsWith(`.${column.columnName}`)
    ) {
      const lastDot = column.key.lastIndexOf('.')
      return `${column.key.slice(0, lastDot + 1)}${blindColumnName}`
    }

    return blindColumnName
  }

  #normalizeBlindIndexValues(indexes: any): any[] {
    if (!indexes) {
      return []
    }

    if (Array.isArray(indexes)) {
      return indexes.filter((item) => item !== null && item !== undefined)
    }

    if (isObject(indexes)) {
      return Object.values(indexes).filter((item) => item !== null && item !== undefined)
    }

    return [indexes]
  }

  #getEncryptedQueryValues(column: EncryptedQueryColumn, value: any): any[] {
    if (value === null || value === undefined || this.#isQueryBuilderValue(value)) {
      return [value]
    }

    if (column.encryption.mode === 'deterministic') {
      const encryption = this.#model.$resolveEncryption(
        column.attributeName,
        'deterministic',
        column.encryption.driver
      )

      return [
        encryption.driver
          ? encryption.provider.encrypt(value, {
              deterministic: true,
              driver: encryption.driver,
            })
          : encryption.provider.encrypt(value, {
              deterministic: true,
            }),
      ]
    }

    if (!column.encryption.purpose) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        `${this.#model.name}.${column.attributeName}`,
        'Missing "blind.purpose"',
      ])
    }

    const encryption = this.#model.$resolveEncryption(
      column.attributeName,
      'blind',
      column.encryption.driver
    )

    const blindIndexes = this.#normalizeBlindIndexValues(
      encryption.provider.blindIndexes(value, {
        purpose: column.encryption.purpose,
        driver: encryption.driver,
      })
    )

    if (blindIndexes.length) {
      return blindIndexes
    }

    return [
      encryption.provider.blindIndex(value, {
        purpose: column.encryption.purpose,
        driver: encryption.driver,
      }),
    ]
  }

  #getEncryptedQueryValue(column: EncryptedQueryColumn, value: any): any {
    return this.#getEncryptedQueryValues(column, value)[0]
  }

  #normalizeOperator(operator: any): string {
    return typeof operator === 'string' ? operator.trim().replace(/\s+/g, ' ').toLowerCase() : ''
  }

  #isInOperator(operator: string): boolean {
    return operator === 'in'
  }

  #isNotInOperator(operator: string): boolean {
    return operator === 'not in'
  }

  #ensureEncryptedEqualityOperator(
    column: EncryptedQueryColumn | null,
    operator: any,
    method: string
  ) {
    if (!column) {
      return
    }

    const normalizedOperator = this.#normalizeOperator(operator)
    if (
      normalizedOperator !== '=' &&
      !this.#isInOperator(normalizedOperator) &&
      !this.#isNotInOperator(normalizedOperator)
    ) {
      this.#raiseUnsupportedEncryptedColumn(method, column)
    }
  }

  #ensureStandardEncryptedQuerySupport(column: EncryptedQueryColumn | null, method: string) {
    if (column?.encryption.mode === 'standard') {
      throw new errors.E_UNSUPPORTED_STANDARD_ENCRYPTED_COLUMN_QUERY([
        method,
        `${this.#model.name}.${column.attributeName}`,
      ])
    }
  }

  #raiseUnsupportedEncryptedColumn(method: string, column: EncryptedQueryColumn) {
    throw new errors.E_UNSUPPORTED_ENCRYPTED_COLUMN_QUERY([
      method,
      `${this.#model.name}.${column.attributeName}`,
    ])
  }

  #getEncryptedWriteValue(column: EncryptedQueryColumn, value: any): any {
    if (value === null || value === undefined || this.#isQueryBuilderValue(value)) {
      return value
    }

    if (column.encryption.mode === 'deterministic') {
      const encryption = this.#model.$resolveEncryption(
        column.attributeName,
        'deterministic',
        column.encryption.driver
      )

      return encryption.driver
        ? encryption.provider.encrypt(value, {
            deterministic: true,
            driver: encryption.driver,
          })
        : encryption.provider.encrypt(value, {
            deterministic: true,
          })
    }

    const encryption = this.#model.$resolveEncryption(
      column.attributeName,
      column.encryption.mode,
      column.encryption.driver
    )

    return encryption.driver
      ? encryption.provider.encrypt(value, {
          driver: encryption.driver,
        })
      : encryption.provider.encrypt(value)
  }

  #getBlindWriteValue(
    column: EncryptedQueryColumn,
    value: any
  ): {
    shouldWrite: boolean
    value: any
  } {
    if (value === null || value === undefined) {
      return { shouldWrite: true, value }
    }

    if (this.#isQueryBuilderValue(value)) {
      return { shouldWrite: false, value: null }
    }

    const purpose = column.encryption.purpose
    if (!purpose) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        `${this.#model.name}.${column.attributeName}`,
        'Missing "blind.purpose"',
      ])
    }

    const encryption = this.#model.$resolveEncryption(
      column.attributeName,
      'blind',
      column.encryption.driver
    )

    return {
      shouldWrite: true,
      value: encryption.provider.blindIndex(value, {
        purpose,
        driver: encryption.driver,
      }),
    }
  }
}

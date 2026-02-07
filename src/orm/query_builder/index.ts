/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Knex } from 'knex'
import { Exception } from '@poppinss/utils/exception'

import {
  type LucidRow,
  type LucidModel,
  type ModelObject,
  type EncryptedColumnMeta,
  type ModelAdapterOptions,
  type ModelQueryBuilderContract,
} from '../../types/model.js'

import {
  type PreloaderContract,
  type RelationshipsContract,
  type RelationQueryBuilderContract,
} from '../../types/relations.js'

import {
  type DialectContract,
  type QueryClientContract,
  type TransactionClientContract,
} from '../../types/database.js'

import { type DBQueryCallback, type Dictionary, type OneOrMany } from '../../types/querybuilder.js'

import { isObject } from '../../utils/index.js'
import { Preloader } from '../preloader/index.js'
import { ModelPaginator } from '../paginator/index.js'
import { QueryRunner } from '../../query_runner/index.js'
import { Chainable } from '../../database/query_builder/chainable.js'
import { SimplePaginator } from '../../database/paginator/simple_paginator.js'
import * as errors from '../../errors.js'

type EncryptedQueryColumn = {
  key: string
  attributeName: string
  columnName: string
  encryption: EncryptedColumnMeta
}

type EncryptedWhereMethod = 'where' | 'orWhere' | 'whereNot' | 'orWhereNot'
type EncryptedWhereInMethod = 'whereIn' | 'orWhereIn' | 'whereNotIn' | 'orWhereNotIn'

/**
 * A wrapper to invoke scope methods on the query builder
 * underlying model
 */
class ModelScopes {
  constructor(protected builder: ModelQueryBuilder) {
    return new Proxy(this, {
      get(target, key) {
        if (typeof (target.builder.model as any)[key] === 'function') {
          return (...args: any[]) => {
            return (target.builder.model as any)[key](target.builder, ...args)
          }
        }

        /**
         * Unknown keys are not allowed
         */
        throw new Error(
          `"${String(key)}" is not defined as a query scope on "${target.builder.model.name}" model`
        )
      },
    })
  }
}

/**
 * Database query builder exposes the API to construct and run queries for selecting,
 * updating and deleting records.
 */
export class ModelQueryBuilder
  extends Chainable
  implements ModelQueryBuilderContract<LucidModel, LucidRow>
{
  /**
   * A copy of defined preloads on the model instance
   */
  protected preloader: PreloaderContract<LucidRow>

  /**
   * A custom callback to transform each model row
   */
  protected rowTransformerCallback?: (row: LucidRow) => void

  /**
   * Required by macroable
   */
  protected static macros = {}
  protected static getters = {}

  /**
   * A references to model scopes wrapper. It is lazily initialized
   * only when the `apply` method is invoked
   */
  private scopesWrapper: ModelScopes | undefined = undefined

  /**
   * Control whether to wrap adapter result to model
   * instances or not
   */
  protected wrapResultsToModelInstances: boolean = true

  /**
   * Custom data someone want to send to the profiler and the
   * query event
   */
  protected customReporterData: any

  /**
   * Control whether to debug the query or not. The initial
   * value is inherited from the query client
   */
  protected debugQueries: boolean

  /**
   * Self join counter, increments with every "withCount"
   * "has" and "whereHas" queries.
   */
  private joinCounter: number = 0

  /**
   * Options that must be passed to all new model instances
   */
  clientOptions: ModelAdapterOptions

  /**
   * Whether query is a sub-query for `.where` callback
   */
  isChildQuery = false

  /**
   * Side-loaded attributes that will be passed to the model instances
   */
  sideloaded: ModelObject = {}

  constructor(
    builder: Knex.QueryBuilder,
    public model: LucidModel,
    public client: QueryClientContract,
    customFn: DBQueryCallback = (userFn) => {
      return ($builder) => {
        const subQuery = new ModelQueryBuilder($builder, this.model, this.client)
        subQuery.isChildQuery = true
        userFn(subQuery)
        subQuery.applyWhere()
      }
    }
  ) {
    super(
      builder,
      customFn,
      model.$keys.attributesToColumns.resolve.bind(model.$keys.attributesToColumns)
    )

    this.preloader = new Preloader(this.model)
    this.debugQueries = this.client.debug
    this.clientOptions = {
      client: this.client,
      connection: this.client.connectionName,
    }

    /**
     * Assign table when not already assigned
     */
    if (!(builder as any)['_single'] || !(builder as any)['_single'].table) {
      builder.table(model.table)
    }
  }

  /**
   * Returns encrypted metadata for a query key.
   */
  private getEncryptedQueryColumn(
    key: any,
    includeStandard: boolean = false
  ): EncryptedQueryColumn | null {
    if (typeof key !== 'string') {
      return null
    }

    const normalizedKey = key.includes('.') ? key.split('.').pop()! : key
    const attributeName =
      this.model.$keys.columnsToAttributes.get(normalizedKey) ??
      this.model.$keys.columnsToAttributes.get(key) ??
      normalizedKey

    if (!this.model.$hasColumn(attributeName)) {
      return null
    }

    const column = this.model.$getColumn(attributeName)!
    if (!this.isModelColumnReference(key, attributeName, column.columnName)) {
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

  /**
   * Returns true when the key references the current model table.
   */
  private isModelColumnReference(key: string, attributeName: string, columnName: string): boolean {
    if (!key.includes('.')) {
      return true
    }

    const lastDot = key.lastIndexOf('.')
    const source = key.slice(0, lastDot)
    const column = key.slice(lastDot + 1)

    if (column !== attributeName && column !== columnName) {
      return false
    }

    if (source === this.model.table || source.endsWith(`.${this.model.table}`)) {
      return true
    }

    if (this.tableAlias && (source === this.tableAlias || source.endsWith(`.${this.tableAlias}`))) {
      return true
    }

    return false
  }

  /**
   * Returns true when the value is a query/raw/reference value and should not be transformed.
   */
  private isQueryBuilderValue(value: any): boolean {
    if (value instanceof Chainable || typeof value === 'function') {
      return true
    }

    return !!value && typeof value === 'object' && ('knexQuery' in value || 'toKnex' in value)
  }

  /**
   * Rewrites the query key for blind-index columns.
   */
  private getEncryptedQueryKey(column: EncryptedQueryColumn): string {
    if (column.encryption.mode !== 'blind') {
      return column.key
    }

    const blindColumnName = column.encryption.blindColumnName
    if (!blindColumnName) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        `${this.model.name}.${column.attributeName}`,
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

  private normalizeBlindIndexValues(indexes: any): any[] {
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

  /**
   * Transforms a query value for deterministic/blind encrypted columns and
   * returns one or many candidate values.
   */
  private getEncryptedQueryValues(column: EncryptedQueryColumn, value: any): any[] {
    if (value === null || value === undefined || this.isQueryBuilderValue(value)) {
      return [value]
    }

    const encryption = this.model.$getEncryption(column.attributeName)

    if (column.encryption.mode === 'deterministic') {
      return [
        encryption.encrypt(value, {
          deterministic: true,
          driver: column.encryption.driver,
        }),
      ]
    }

    if (!column.encryption.purpose) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        `${this.model.name}.${column.attributeName}`,
        'Missing "blind.purpose"',
      ])
    }

    const blindIndexes = this.normalizeBlindIndexValues(
      encryption.blindIndexes(value, {
        purpose: column.encryption.purpose,
        driver: column.encryption.driver,
      })
    )

    if (blindIndexes.length) {
      return blindIndexes
    }

    return [
      encryption.blindIndex(value, {
        purpose: column.encryption.purpose,
        driver: column.encryption.driver,
      }),
    ]
  }

  /**
   * Returns the first transformed query value.
   */
  private getEncryptedQueryValue(column: EncryptedQueryColumn, value: any): any {
    return this.getEncryptedQueryValues(column, value)[0]
  }

  /**
   * Normalize operators used by where/orWhere methods.
   */
  private normalizeOperator(operator: any): string {
    return typeof operator === 'string' ? operator.trim().replace(/\s+/g, ' ').toLowerCase() : ''
  }

  /**
   * Check if operator maps to an IN clause.
   */
  private isInOperator(operator: string): boolean {
    return operator === 'in'
  }

  /**
   * Check if operator maps to a NOT IN clause.
   */
  private isNotInOperator(operator: string): boolean {
    return operator === 'not in'
  }

  /**
   * Raises when using a non equality operator for deterministic/blind columns.
   */
  private ensureEncryptedEqualityOperator(
    column: EncryptedQueryColumn | null,
    operator: any,
    method: string
  ) {
    if (!column) {
      return
    }

    const normalizedOperator = this.normalizeOperator(operator)
    if (
      normalizedOperator !== '=' &&
      !this.isInOperator(normalizedOperator) &&
      !this.isNotInOperator(normalizedOperator)
    ) {
      throw new errors.E_UNSUPPORTED_ENCRYPTED_COLUMN_QUERY([
        method,
        `${this.model.name}.${column.attributeName}`,
      ])
    }
  }

  /**
   * Routes operator forms using IN/NOT IN through the dedicated methods.
   */
  private handleEncryptedInOperator(
    method: EncryptedWhereMethod,
    key: string,
    operator: any,
    value: any
  ): this | null {
    const column = this.getEncryptedQueryColumn(key)
    if (!column) {
      return null
    }

    const normalizedOperator = this.normalizeOperator(operator)
    if (!this.isInOperator(normalizedOperator) && !this.isNotInOperator(normalizedOperator)) {
      return null
    }

    const whereInMethod = this.getEncryptedWhereInMethod(method)
    const targetMethod = this.isInOperator(normalizedOperator)
      ? whereInMethod
      : this.getOppositeEncryptedWhereInMethod(whereInMethod)

    return this.encryptedWhereIn(targetMethod, key, value)
  }

  /**
   * Returns the IN method associated with a WHERE variant.
   */
  private getEncryptedWhereInMethod(method: EncryptedWhereMethod): EncryptedWhereInMethod {
    if (method === 'where') {
      return 'whereIn'
    }

    if (method === 'orWhere') {
      return 'orWhereIn'
    }

    if (method === 'whereNot') {
      return 'whereNotIn'
    }

    return 'orWhereNotIn'
  }

  /**
   * Returns the opposite IN method (IN <-> NOT IN) preserving the boolean variant.
   */
  private getOppositeEncryptedWhereInMethod(
    method: EncryptedWhereInMethod
  ): EncryptedWhereInMethod {
    if (method === 'whereIn') {
      return 'whereNotIn'
    }

    if (method === 'orWhereIn') {
      return 'orWhereNotIn'
    }

    if (method === 'whereNotIn') {
      return 'whereIn'
    }

    return 'orWhereIn'
  }

  /**
   * Calls the matching super where* method with a single argument.
   */
  private callSuperWhereUnary(method: EncryptedWhereMethod, key: any): this {
    if (method === 'where') {
      return super.where(key)
    }

    if (method === 'orWhere') {
      return super.orWhere(key)
    }

    if (method === 'whereNot') {
      return super.whereNot(key)
    }

    return super.orWhereNot(key)
  }

  /**
   * Calls the matching super where* method with 2 arguments.
   */
  private callSuperWhereBinary(method: EncryptedWhereMethod, key: any, value: any): this {
    if (method === 'where') {
      return super.where(key, value)
    }

    if (method === 'orWhere') {
      return super.orWhere(key, value)
    }

    if (method === 'whereNot') {
      return super.whereNot(key, value)
    }

    return super.orWhereNot(key, value)
  }

  /**
   * Calls the matching super where* method with 3 arguments.
   */
  private callSuperWhereTernary(
    method: EncryptedWhereMethod,
    key: any,
    operator: any,
    value: any
  ): this {
    if (method === 'where') {
      return super.where(key, operator, value)
    }

    if (method === 'orWhere') {
      return super.orWhere(key, operator, value)
    }

    if (method === 'whereNot') {
      return super.whereNot(key, operator, value)
    }

    return super.orWhereNot(key, operator, value)
  }

  /**
   * Calls the matching super where*In method.
   */
  private callSuperWhereIn(method: EncryptedWhereInMethod, columns: any, value: any): this {
    if (method === 'whereIn') {
      return super.whereIn(columns, value)
    }

    if (method === 'orWhereIn') {
      return super.orWhereIn(columns, value)
    }

    if (method === 'whereNotIn') {
      return super.whereNotIn(columns, value)
    }

    return super.orWhereNotIn(columns, value)
  }

  /**
   * Shared implementation for where/orWhere/whereNot/orWhereNot.
   */
  private encryptedWhere(
    method: EncryptedWhereMethod,
    key: any,
    operator?: any,
    value?: any
  ): this {
    if (value !== undefined && typeof key === 'string') {
      const column = this.getEncryptedQueryColumn(key)
      const inOperatorResult = this.handleEncryptedInOperator(method, key, operator, value)
      if (inOperatorResult) {
        return inOperatorResult
      }
      this.ensureEncryptedEqualityOperator(column, operator, method)

      if (column?.encryption.mode === 'blind') {
        const encryptedValues = this.getEncryptedQueryValues(column, value)
        const encryptedKey = this.getEncryptedQueryKey(column)
        const whereInMethod = this.getEncryptedWhereInMethod(method)

        return encryptedValues.length > 1
          ? this.callSuperWhereIn(whereInMethod, encryptedKey, encryptedValues)
          : this.callSuperWhereTernary(method, encryptedKey, operator, encryptedValues[0])
      }

      return this.callSuperWhereTernary(
        method,
        column ? this.getEncryptedQueryKey(column) : key,
        operator,
        column ? this.getEncryptedQueryValue(column, value) : value
      )
    }

    if (operator !== undefined && typeof key === 'string') {
      const column = this.getEncryptedQueryColumn(key)

      if (column?.encryption.mode === 'blind') {
        const encryptedValues = this.getEncryptedQueryValues(column, operator)
        const encryptedKey = this.getEncryptedQueryKey(column)
        const whereInMethod = this.getEncryptedWhereInMethod(method)

        return encryptedValues.length > 1
          ? this.callSuperWhereIn(whereInMethod, encryptedKey, encryptedValues)
          : this.callSuperWhereBinary(method, encryptedKey, encryptedValues[0])
      }

      return this.callSuperWhereBinary(
        method,
        column ? this.getEncryptedQueryKey(column) : key,
        column ? this.getEncryptedQueryValue(column, operator) : operator
      )
    }

    if (isObject(key)) {
      const clauses = Object.entries(key)

      if (!clauses.length) {
        return method === 'where' ? this.callSuperWhereUnary(method, key) : this
      }

      if (method === 'orWhere') {
        return this.callSuperWhereUnary(method, (query: ModelQueryBuilder) => {
          clauses.forEach(([clauseKey, clauseValue]) => {
            query.where(clauseKey, clauseValue)
          })
        })
      }

      clauses.forEach(([clauseKey, clauseValue]) => {
        this.encryptedWhere(method, clauseKey, clauseValue)
      })

      return this
    }

    return this.callSuperWhereTernary(method, key, operator, value)
  }

  /**
   * Shared implementation for whereIn/orWhereIn/whereNotIn/orWhereNotIn.
   */
  private encryptedWhereIn(method: EncryptedWhereInMethod, columns: any, value: any): this {
    if (typeof columns !== 'string') {
      return this.callSuperWhereIn(method, columns, value)
    }

    const column = this.getEncryptedQueryColumn(columns)
    if (!column) {
      return this.callSuperWhereIn(method, columns, value)
    }

    const transformedValue = Array.isArray(value)
      ? value.flatMap((item) => this.getEncryptedQueryValues(column, item))
      : this.isQueryBuilderValue(value)
        ? value
        : this.getEncryptedQueryValues(column, value)

    return this.callSuperWhereIn(method, this.getEncryptedQueryKey(column), transformedValue)
  }

  /**
   * Raises for unsupported encrypted column operators.
   */
  private ensureEncryptedMethodSupport(key: any, method: string) {
    const column = this.getEncryptedQueryColumn(key)
    if (column) {
      throw new errors.E_UNSUPPORTED_ENCRYPTED_COLUMN_QUERY([
        method,
        `${this.model.name}.${column.attributeName}`,
      ])
    }
  }

  /**
   * Raises for unsupported column-vs-column comparisons on encrypted columns.
   */
  private ensureEncryptedColumnComparisonSupport(
    method: string,
    column: any,
    comparisonColumn: any
  ) {
    this.ensureEncryptedMethodSupport(column, method)
    this.ensureEncryptedMethodSupport(comparisonColumn, method)
  }

  /**
   * Encrypt value before writing it to an encrypted model column.
   */
  private getEncryptedWriteValue(column: EncryptedQueryColumn, value: any): any {
    if (value === null || value === undefined || this.isQueryBuilderValue(value)) {
      return value
    }

    const encryption = this.model.$getEncryption(column.attributeName)
    if (column.encryption.mode === 'deterministic') {
      return encryption.encrypt(value, {
        deterministic: true,
        driver: column.encryption.driver,
      })
    }

    if (column.encryption.driver) {
      return encryption.encrypt(value, {
        driver: column.encryption.driver,
      })
    }

    return encryption.encrypt(value)
  }

  /**
   * Compute blind index value for writes.
   */
  private getBlindWriteValue(
    column: EncryptedQueryColumn,
    value: any
  ): {
    shouldWrite: boolean
    value: any
  } {
    if (value === null || value === undefined) {
      return { shouldWrite: true, value }
    }

    if (this.isQueryBuilderValue(value)) {
      return { shouldWrite: false, value: null }
    }

    const purpose = column.encryption.purpose
    if (!purpose) {
      throw new errors.E_INVALID_ENCRYPTED_COLUMN_CONFIGURATION([
        `${this.model.name}.${column.attributeName}`,
        'Missing "blind.purpose"',
      ])
    }

    const encryption = this.model.$getEncryption(column.attributeName)
    return {
      shouldWrite: true,
      value: encryption.blindIndex(value, {
        purpose,
        driver: column.encryption.driver,
      }),
    }
  }

  /**
   * Prepares update payload by applying encrypted column transforms.
   */
  private prepareUpdateValues(values: Dictionary<any, string>): Dictionary<any, string> {
    const result: Dictionary<any, string> = {}
    const blindWrites: Array<{ value: any; column: EncryptedQueryColumn }> = []

    Object.keys(values).forEach((key) => {
      const value = values[key]
      const column = this.getEncryptedQueryColumn(key, true)

      if (!column) {
        result[this.resolveKey(key)] = this.transformRaw(value)
        return
      }

      result[this.resolveKey(key)] = this.transformRaw(this.getEncryptedWriteValue(column, value))

      if (column.encryption.mode === 'blind') {
        blindWrites.push({ value, column })
      }
    })

    /**
     * Apply blind writes after processing the original payload so computed indexes
     * always win over any manually provided blind column value, regardless of key order.
     */
    blindWrites.forEach(({ value, column }) => {
      const blindResult = this.getBlindWriteValue(column, value)
      if (blindResult.shouldWrite) {
        result[this.resolveKey(this.getEncryptedQueryKey(column))] = this.transformRaw(
          blindResult.value
        )
      }
    })

    return result
  }

  where(key: any, operator?: any, value?: any): this {
    return this.encryptedWhere('where', key, operator, value)
  }

  orWhere(key: any, operator?: any, value?: any): this {
    return this.encryptedWhere('orWhere', key, operator, value)
  }

  whereNot(key: any, operator?: any, value?: any): this {
    return this.encryptedWhere('whereNot', key, operator, value)
  }

  orWhereNot(key: any, operator?: any, value?: any): this {
    return this.encryptedWhere('orWhereNot', key, operator, value)
  }

  whereIn(columns: any, value: any): this {
    return this.encryptedWhereIn('whereIn', columns, value)
  }

  orWhereIn(columns: any, value: any): this {
    return this.encryptedWhereIn('orWhereIn', columns, value)
  }

  whereNotIn(columns: any, value: any): this {
    return this.encryptedWhereIn('whereNotIn', columns, value)
  }

  orWhereNotIn(columns: any, value: any): this {
    return this.encryptedWhereIn('orWhereNotIn', columns, value)
  }

  whereLike(key: any, value: any): this {
    this.ensureEncryptedMethodSupport(key, 'whereLike')
    return super.whereLike(key, value)
  }

  whereColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.ensureEncryptedColumnComparisonSupport('whereColumn', column, comparisonColumn)
      return super.whereColumn(column, operator, comparisonColumn)
    }

    this.ensureEncryptedColumnComparisonSupport('whereColumn', column, operator)
    return super.whereColumn(column, operator)
  }

  orWhereColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.ensureEncryptedColumnComparisonSupport('orWhereColumn', column, comparisonColumn)
      return super.orWhereColumn(column, operator, comparisonColumn)
    }

    this.ensureEncryptedColumnComparisonSupport('orWhereColumn', column, operator)
    return super.orWhereColumn(column, operator)
  }

  whereNotColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.ensureEncryptedColumnComparisonSupport('whereNotColumn', column, comparisonColumn)
      return super.whereNotColumn(column, operator, comparisonColumn)
    }

    this.ensureEncryptedColumnComparisonSupport('whereNotColumn', column, operator)
    return super.whereNotColumn(column, operator)
  }

  orWhereNotColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.ensureEncryptedColumnComparisonSupport('orWhereNotColumn', column, comparisonColumn)
      return super.orWhereNotColumn(column, operator, comparisonColumn)
    }

    this.ensureEncryptedColumnComparisonSupport('orWhereNotColumn', column, operator)
    return super.orWhereNotColumn(column, operator)
  }

  orWhereLike(key: any, value: any): this {
    this.ensureEncryptedMethodSupport(key, 'orWhereLike')
    return super.orWhereLike(key, value)
  }

  whereILike(key: any, value: any): this {
    this.ensureEncryptedMethodSupport(key, 'whereILike')
    return super.whereILike(key, value)
  }

  orWhereILike(key: any, value: any): this {
    this.ensureEncryptedMethodSupport(key, 'orWhereILike')
    return super.orWhereILike(key, value)
  }

  whereBetween(key: any, value: [any, any]): this {
    this.ensureEncryptedMethodSupport(key, 'whereBetween')
    return super.whereBetween(key, value)
  }

  orWhereBetween(key: any, value: [any, any]): this {
    this.ensureEncryptedMethodSupport(key, 'orWhereBetween')
    return super.orWhereBetween(key, value)
  }

  whereNotBetween(key: any, value: [any, any]): this {
    this.ensureEncryptedMethodSupport(key, 'whereNotBetween')
    return super.whereNotBetween(key, value)
  }

  orWhereNotBetween(key: any, value: [any, any]): this {
    this.ensureEncryptedMethodSupport(key, 'orWhereNotBetween')
    return super.orWhereNotBetween(key, value)
  }

  whereJson(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'whereJson')
    return super.whereJson(column, value)
  }

  orWhereJson(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'orWhereJson')
    return super.orWhereJson(column, value)
  }

  whereNotJson(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'whereNotJson')
    return super.whereNotJson(column, value)
  }

  orWhereNotJson(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'orWhereNotJson')
    return super.orWhereNotJson(column, value)
  }

  whereJsonSuperset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'whereJsonSuperset')
    return super.whereJsonSuperset(column, value)
  }

  orWhereJsonSuperset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'orWhereJsonSuperset')
    return super.orWhereJsonSuperset(column, value)
  }

  whereNotJsonSuperset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'whereNotJsonSuperset')
    return super.whereNotJsonSuperset(column, value)
  }

  orWhereNotJsonSuperset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'orWhereNotJsonSuperset')
    return super.orWhereNotJsonSuperset(column, value)
  }

  whereJsonSubset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'whereJsonSubset')
    return super.whereJsonSubset(column, value)
  }

  orWhereJsonSubset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'orWhereJsonSubset')
    return super.orWhereJsonSubset(column, value)
  }

  whereNotJsonSubset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'whereNotJsonSubset')
    return super.whereNotJsonSubset(column, value)
  }

  orWhereNotJsonSubset(column: string, value: any) {
    this.ensureEncryptedMethodSupport(column, 'orWhereNotJsonSubset')
    return super.orWhereNotJsonSubset(column, value)
  }

  whereJsonPath(column: string, jsonPath: string, operator: any, value?: any): this {
    this.ensureEncryptedMethodSupport(column, 'whereJsonPath')
    return super.whereJsonPath(column, jsonPath, operator, value)
  }

  orWhereJsonPath(column: string, jsonPath: string, operator: any, value?: any): this {
    this.ensureEncryptedMethodSupport(column, 'orWhereJsonPath')
    return super.orWhereJsonPath(column, jsonPath, operator, value)
  }

  /**
   * Executes the current query
   */
  private async execQuery() {
    this.applyWhere()

    const isWriteQuery = ['update', 'del', 'insert'].includes((this.knexQuery as any)['_method'])
    const queryData = Object.assign(this.getQueryData(), this.customReporterData)
    const rows = await new QueryRunner(this.client, this.debugQueries, queryData).run(
      this.knexQuery
    )

    /**
     * Return the rows as it is when query is a write query
     */
    if (isWriteQuery || !this.wrapResultsToModelInstances) {
      return Array.isArray(rows) ? rows : [rows]
    }

    /**
     * Convert fetched results to an array of model instances
     */
    const modelInstances = rows.reduce((models: LucidRow[], row: ModelObject) => {
      if (isObject(row)) {
        const modelInstance = this.model.$createFromAdapterResult(
          row,
          this.sideloaded,
          this.clientOptions
        )!

        /**
         * Transform row when row transformer is defined
         */
        if (this.rowTransformerCallback) {
          this.rowTransformerCallback(modelInstance)
        }

        models.push(modelInstance)
      }
      return models
    }, [])

    /**
     * Preload for model instances
     */
    await this.preloader
      .sideload(this.sideloaded)
      .debug(this.debugQueries)
      .processAllForMany(modelInstances, this.client)

    return modelInstances
  }

  /**
   * Ensures that we are not executing `update` or `del` when using read only
   * client
   */
  private ensureCanPerformWrites() {
    if (this.client && this.client.mode === 'read') {
      throw new Exception('Updates and deletes cannot be performed in read mode')
    }
  }

  /**
   * Defines sub query for checking the existence of a relationship
   */
  private addWhereHas(
    relationName: any,
    boolean: 'or' | 'and' | 'not' | 'orNot',
    operator?: string,
    value?: any,
    callback?: any
  ) {
    let rawMethod: string = 'whereRaw'
    let existsMethod: string = 'whereExists'

    switch (boolean) {
      case 'or':
        rawMethod = 'orWhereRaw'
        existsMethod = 'orWhereExists'
        break
      case 'not':
        existsMethod = 'whereNotExists'
        break
      case 'orNot':
        rawMethod = 'orWhereRaw'
        existsMethod = 'orWhereNotExists'
        break
    }

    const subQuery = this.getRelationship(relationName).subQuery(this.client)
    subQuery.selfJoinCounter = this.joinCounter

    /**
     * Invoke callback when defined
     */
    if (typeof callback === 'function') {
      callback(subQuery)
    }

    /**
     * Count all when value and operator are defined.
     */
    if (value !== undefined && operator !== undefined) {
      /**
       * If user callback has not defined any aggregates, then we should
       * add a count
       */
      if (!subQuery.hasAggregates) {
        subQuery.count('*')
      }

      /**
       * Pull sql and bindings from the query
       */
      const { sql, bindings } = subQuery.prepare().toSQL()

      /**
       * Define where raw clause. Query builder doesn't have any "whereNotRaw" method
       * and hence we need to prepend the `NOT` keyword manually
       */
      boolean === 'orNot' || boolean === 'not'
        ? (this as any)[rawMethod](`not (${sql}) ${operator} (?)`, bindings.concat([value]))
        : (this as any)[rawMethod](`(${sql}) ${operator} (?)`, bindings.concat([value]))

      return this
    }

    /**
     * Use where exists when no operator and value is defined
     */
    ;(this as any)[existsMethod](subQuery.prepare())
    return this
  }

  /**
   * Returns the profiler action. Protected, since the class is extended
   * by relationships
   */
  protected getQueryData() {
    return {
      connection: this.client.connectionName,
      inTransaction: this.client.isTransaction,
      model: this.model.name,
    }
  }

  /**
   * Returns the relationship instance from the model. An exception is
   * raised when relationship is missing
   */
  protected getRelationship(name: string): RelationshipsContract {
    const relation = this.model.$getRelation(name) as RelationshipsContract

    /**
     * Ensure relationship exists
     */
    if (!relation) {
      throw new errors.E_UNDEFINED_RELATIONSHIP([name, this.model.name])
    }

    relation.boot()
    return relation
  }

  /**
   * Define custom reporter data. It will be merged with
   * the existing data
   */
  reporterData(data: any) {
    this.customReporterData = data
    return this
  }

  /**
   * Define a custom callback to transform rows
   */
  rowTransformer(callback: (row: LucidRow) => void): this {
    this.rowTransformerCallback = callback
    return this
  }

  /**
   * Clone the current query builder
   */
  clone<ClonedResult = LucidRow>(): ModelQueryBuilderContract<LucidModel, ClonedResult> {
    const clonedQuery = new ModelQueryBuilder(this.knexQuery.clone(), this.model, this.client)
    this.applyQueryFlags(clonedQuery)

    clonedQuery.usePreloader(this.preloader.clone())
    clonedQuery.sideloaded = Object.assign({}, this.sideloaded)
    clonedQuery.debug(this.debugQueries)
    clonedQuery.reporterData(this.customReporterData)
    this.rowTransformerCallback && this.rowTransformer(this.rowTransformerCallback)

    return clonedQuery as ModelQueryBuilderContract<LucidModel, ClonedResult>
  }

  /**
   * Define returning columns
   */
  returning(columns: any): this {
    if (this.client.dialect.supportsReturningStatement) {
      columns = Array.isArray(columns)
        ? columns.map((column) => this.resolveKey(column))
        : this.resolveKey(columns)

      this.knexQuery.returning(columns)
    }

    return this
  }

  /**
   * Define a query to constraint to be defined when condition is truthy
   */
  ifDialect(
    dialects: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this {
    dialects = Array.isArray(dialects) ? dialects : [dialects]

    if (dialects.includes(this.client.dialect.name)) {
      matchCallback(this)
    } else if (noMatchCallback) {
      noMatchCallback(this)
    }

    return this
  }

  /**
   * Define a query to constraint to be defined when condition is falsy
   */
  unlessDialect(
    dialects: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this {
    dialects = Array.isArray(dialects) ? dialects : [dialects]

    if (!dialects.includes(this.client.dialect.name)) {
      matchCallback(this)
    } else if (noMatchCallback) {
      noMatchCallback(this)
    }

    return this
  }

  /**
   * Applies the query scopes on the current query builder
   * instance
   */
  withScopes(callback: (scopes: any) => void): this {
    this.scopesWrapper = this.scopesWrapper || new ModelScopes(this)
    callback(this.scopesWrapper)
    return this
  }

  /**
   * Applies the query scopes on the current query builder
   * instance
   */
  apply(callback: (scopes: any) => void): this {
    return this.withScopes(callback)
  }

  /**
   * Define a custom preloader instance for preloading relationships
   */
  usePreloader(preloader: PreloaderContract<LucidRow>) {
    this.preloader = preloader
    return this
  }

  /**
   * Set side-loaded properties to be passed to the model instance
   */
  sideload(value: ModelObject, merge = false) {
    if (merge) {
      Object.assign(this.sideloaded, value)
    } else {
      this.sideloaded = value
    }

    return this
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  async first(): Promise<any> {
    const isFetchCall =
      this.wrapResultsToModelInstances && (this.knexQuery as any)['_method'] === 'select'

    if (isFetchCall) {
      await this.model.$hooks.runner('before:find').run(this)
    }

    const result = await this.limit(1).execQuery()

    if (result[0] && isFetchCall) {
      await this.model.$hooks.runner('after:find').run(result[0])
    }

    return result[0] || null
  }

  /**
   * Fetch and return first results from the results set. This method
   * will implicitly set a `limit` on the query
   */
  async firstOrFail(): Promise<any> {
    const row = await this.first()
    if (!row) {
      throw new errors.E_ROW_NOT_FOUND(this.model)
    }

    return row
  }

  /**
   * Load aggregate value as a sub-query for a relationship
   */
  withAggregate(relationName: any, userCallback: any): this {
    const subQuery = this.getRelationship(relationName).subQuery(this.client)
    subQuery.selfJoinCounter = this.joinCounter

    /**
     * Invoke user callback
     */
    userCallback(subQuery)

    /**
     * Raise exception if the callback has not defined an aggregate
     */
    if (!subQuery.hasAggregates) {
      throw new Exception('"withAggregate" callback must use an aggregate function')
    }

    /**
     * Select "*" when no custom selects are defined
     */
    if (!this.columns.length) {
      this.select(`${this.model.table}.*`)
    }

    /**
     * Throw exception when no alias
     */
    if (!subQuery.subQueryAlias) {
      throw new Exception('"withAggregate" callback must define the alias for the aggregate query')
    }

    /**
     * Count sub-query selection
     */
    this.select(subQuery.prepare())

    /**
     * Bump the counter
     */
    this.joinCounter++

    return this
  }

  /**
   * Get count of a relationship alongside the main query results
   */
  withCount(relationName: any, userCallback?: any): this {
    this.withAggregate(relationName, (subQuery: RelationQueryBuilderContract<any, any>) => {
      if (typeof userCallback === 'function') {
        userCallback(subQuery)
      }

      /**
       * Count "*"
       */
      if (!subQuery.hasAggregates) {
        subQuery.count('*')
      }

      /**
       * Define alias for the sub-query
       */
      if (!subQuery.subQueryAlias) {
        subQuery.as(`${relationName}_count`)
      }
    })

    return this
  }

  /**
   * Add where constraint using the relationship
   */
  whereHas(relationName: any, callback: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'and', operator, value, callback)
  }

  /**
   * Add or where constraint using the relationship
   */
  orWhereHas(relationName: any, callback: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'or', operator, value, callback)
  }

  /**
   * Alias of [[whereHas]]
   */
  andWhereHas(relationName: any, callback: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'and', operator, value, callback)
  }

  /**
   * Add where not constraint using the relationship
   */
  whereDoesntHave(relationName: any, callback: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'not', operator, value, callback)
  }

  /**
   * Add or where not constraint using the relationship
   */
  orWhereDoesntHave(relationName: any, callback: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'orNot', operator, value, callback)
  }

  /**
   * Alias of [[whereDoesntHave]]
   */
  andWhereDoesntHave(relationName: any, callback: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'not', operator, value, callback)
  }

  /**
   * Add where constraint using the relationship
   */
  has(relationName: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'and', operator, value)
  }

  /**
   * Add or where constraint using the relationship
   */
  orHas(relationName: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'or', operator, value)
  }

  /**
   * Alias of [[has]]
   */
  andHas(relationName: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'and', operator, value)
  }

  /**
   * Add where not constraint using the relationship
   */
  doesntHave(relationName: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'not', operator, value)
  }

  /**
   * Add or where not constraint using the relationship
   */
  orDoesntHave(relationName: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'orNot', operator, value)
  }

  /**
   * Alias of [[doesntHave]]
   */
  andDoesntHave(relationName: any, operator?: string, value?: any): this {
    return this.addWhereHas(relationName, 'not', operator, value)
  }

  /**
   * Define a relationship to be preloaded
   */
  preload(relationName: any, userCallback?: any): this {
    this.preloader.load(relationName, userCallback)
    return this
  }

  /**
   * Define a relationship to preload, but only if they are not
   * already preloaded
   */
  preloadOnce(relationName: any): this {
    this.preloader.preloadOnce(relationName)
    return this
  }

  /**
   * Perform update by incrementing value for a given column. Increments
   * can be clubbed with `update` as well
   */
  increment(column: any, counter?: any): any {
    this.ensureCanPerformWrites()
    this.knexQuery.increment(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  decrement(column: any, counter?: any): any {
    this.ensureCanPerformWrites()
    this.knexQuery.decrement(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update
   */
  update(
    values: Dictionary<any, string>,
    returning?: OneOrMany<string>
  ): ModelQueryBuilderContract<LucidModel>
  update(
    column: string,
    value: any,
    returning?: OneOrMany<string>
  ): ModelQueryBuilderContract<LucidModel>
  update(
    column: string | Dictionary<any, string>,
    value?: any | OneOrMany<string>,
    returning?: OneOrMany<string>
  ): ModelQueryBuilderContract<LucidModel> {
    this.ensureCanPerformWrites()

    if (column && typeof column === 'object') {
      const columns = this.prepareUpdateValues(column)
      if (value === undefined) {
        this.knexQuery.update(columns)
      } else {
        this.knexQuery.update(columns, value)
      }

      return this
    }

    if (value === undefined) {
      this.knexQuery.update(column)
      return this
    }

    const columns = this.prepareUpdateValues({
      [column]: value,
    })

    if (returning === undefined) {
      this.knexQuery.update(columns)
    } else {
      this.knexQuery.update(columns, returning)
    }

    return this
  }

  /**
   * Delete rows under the current query
   */
  del(): any {
    this.ensureCanPerformWrites()
    this.knexQuery.del()
    return this
  }

  /**
   * Alias for [[del]]
   */
  delete(): any {
    return this.del()
  }

  /**
   * Turn on/off debugging for this query
   */
  debug(debug: boolean): this {
    this.debugQueries = debug
    return this
  }

  /**
   * Define query timeout
   */
  timeout(time: number, options?: { cancel: boolean }): this {
    this.knexQuery['timeout'](time, options)
    return this
  }

  /**
   * Returns SQL query as a string
   */
  toQuery(): string {
    this.applyWhere()
    return this.knexQuery.toQuery()
  }

  /**
   * @deprecated
   * Do not use this method. Instead create a query with options.client
   *
   * ```ts
   * Model.query({ client: trx })
   * ```
   */
  useTransaction(transaction: TransactionClientContract) {
    this.knexQuery.transacting(transaction.knexClient)
    return this
  }

  /**
   * Executes the query
   */
  async exec(): Promise<any[]> {
    const isFetchCall =
      this.wrapResultsToModelInstances && (this.knexQuery as any)['_method'] === 'select'

    if (isFetchCall) {
      await this.model.$hooks.runner('before:fetch').run(this)
    }

    const result = await this.execQuery()

    if (isFetchCall) {
      await this.model.$hooks.runner('after:fetch').run(result)
    }

    return result
  }

  /**
   * Paginate through rows inside a given table
   */
  async paginate(page: number, perPage: number = 20): Promise<any> {
    const isFetchCall =
      this.wrapResultsToModelInstances && (this.knexQuery as any)['_method'] === 'select'

    /**
     * Cast to number
     */
    page = Number(page)
    perPage = Number(perPage)

    const countQuery = this.clone()
      .clearOrder()
      .clearLimit()
      .clearOffset()
      .clearSelect()
      .count('* as total')
      .pojo<{ total: number }>()

    /**
     * We pass both the counts query and the main query to the
     * paginate hook
     */
    if (isFetchCall) {
      await this.model.$hooks.runner('before:paginate').run([countQuery, this])
      await this.model.$hooks.runner('before:fetch').run(this)
    }

    const aggregateResult = await countQuery.exec()
    const total = this.hasGroupBy ? aggregateResult.length : aggregateResult[0].total

    const results = total > 0 ? await this.forPage(page, perPage).execQuery() : []

    /**
     * Choose paginator
     */
    const paginator = this.wrapResultsToModelInstances
      ? new ModelPaginator(total, perPage, page, ...results)
      : new SimplePaginator(total, perPage, page, ...results)

    paginator.namingStrategy = this.model.namingStrategy

    if (isFetchCall) {
      await this.model.$hooks.runner('after:paginate').run(paginator)
      await this.model.$hooks.runner('after:fetch').run(results)
    }

    return paginator
  }

  /**
   * Get sql representation of the query
   */
  toSQL(): Knex.Sql {
    this.applyWhere()
    return this.knexQuery.toSQL()
  }

  /**
   * Get rows back as a plain javascript object and not an array
   * of model instances
   */
  pojo(): this {
    this.wrapResultsToModelInstances = false
    return this
  }

  /**
   * Implementation of `then` for the promise API
   */
  then(resolve: any, reject?: any): any {
    return this.exec().then(resolve, reject)
  }

  /**
   * Implementation of `catch` for the promise API
   */
  catch(reject: any): any {
    return this.exec().catch(reject)
  }

  /**
   * Implementation of `finally` for the promise API
   */
  finally(fulfilled: any) {
    return this.exec().finally(fulfilled)
  }

  /**
   * Required when Promises are extended
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name
  }
}

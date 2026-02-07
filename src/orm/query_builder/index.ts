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
import {
  EncryptedQuerySupport,
  type EncryptedWhereMethod,
  type EncryptedWhereInMethod,
  type EncryptedWhereRewrite,
} from './encrypted_query_support.js'

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
   * Support class responsible for encrypted query rewrites and guards.
   */
  private encryptedSupport: EncryptedQuerySupport

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
    this.encryptedSupport = new EncryptedQuerySupport(this.model, () => this.tableAlias)
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
   * Calls the matching super where* method.
   */
  private callSuperWhere(
    method: EncryptedWhereMethod,
    key: any,
    operator?: any,
    value?: any
  ): this {
    if (value !== undefined) {
      switch (method) {
        case 'where':
          return super.where(key, operator, value)
        case 'orWhere':
          return super.orWhere(key, operator, value)
        case 'whereNot':
          return super.whereNot(key, operator, value)
        case 'orWhereNot':
          return super.orWhereNot(key, operator, value)
      }
    }

    if (operator !== undefined) {
      switch (method) {
        case 'where':
          return super.where(key, operator)
        case 'orWhere':
          return super.orWhere(key, operator)
        case 'whereNot':
          return super.whereNot(key, operator)
        case 'orWhereNot':
          return super.orWhereNot(key, operator)
      }
    }

    switch (method) {
      case 'where':
        return super.where(key)
      case 'orWhere':
        return super.orWhere(key)
      case 'whereNot':
        return super.whereNot(key)
      case 'orWhereNot':
        return super.orWhereNot(key)
    }
  }

  /**
   * Calls the matching super where*In method.
   */
  private callSuperWhereIn(method: EncryptedWhereInMethod, columns: any, value: any): this {
    switch (method) {
      case 'whereIn':
        return super.whereIn(columns, value)
      case 'orWhereIn':
        return super.orWhereIn(columns, value)
      case 'whereNotIn':
        return super.whereNotIn(columns, value)
      case 'orWhereNotIn':
        return super.orWhereNotIn(columns, value)
    }
  }

  /**
   * Applies encrypted where rewrite instructions to the matching super method.
   */
  private applyWhereRewrite(rewrite: EncryptedWhereRewrite): this {
    if (rewrite.target === 'whereIn') {
      return this.callSuperWhereIn(rewrite.method, rewrite.columns, rewrite.value)
    }

    if (rewrite.args.length === 1) {
      return this.callSuperWhere(rewrite.method, rewrite.args[0])
    }

    if (rewrite.args.length === 2) {
      return this.callSuperWhere(rewrite.method, rewrite.args[0], rewrite.args[1])
    }

    return this.callSuperWhere(rewrite.method, rewrite.args[0], rewrite.args[1], rewrite.args[2])
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
    if (typeof key === 'string') {
      if (value !== undefined) {
        return this.applyWhereRewrite(
          this.encryptedSupport.rewriteWhereTernary(method, key, operator, value)
        )
      }

      if (operator !== undefined) {
        return this.applyWhereRewrite(
          this.encryptedSupport.rewriteWhereBinary(method, key, operator)
        )
      }
    }

    if (!isObject(key)) {
      return this.callSuperWhere(method, key, operator, value)
    }

    const clauses = Object.entries(key)
    if (!clauses.length) {
      return method === 'where' ? this.callSuperWhere(method, key) : this
    }

    if (method === 'orWhere') {
      return this.callSuperWhere(method, (query: ModelQueryBuilder) => {
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

  /**
   * Shared implementation for whereIn/orWhereIn/whereNotIn/orWhereNotIn.
   */
  private encryptedWhereIn(method: EncryptedWhereInMethod, columns: any, value: any): this {
    const rewrite = this.encryptedSupport.rewriteWhereIn(method, columns, value)
    return this.callSuperWhereIn(rewrite.method, rewrite.columns, rewrite.value)
  }

  /**
   * Raises for unsupported encrypted column operators.
   */
  private ensureEncryptedMethodSupport(key: any, method: string) {
    this.encryptedSupport.ensureMethodSupport(key, method)
  }

  /**
   * Extract string columns from orderBy inputs.
   */
  private getOrderByColumns(column: any): string[] {
    if (typeof column === 'string') {
      return [column]
    }

    if (!Array.isArray(column)) {
      if (column && typeof column === 'object' && typeof column.column === 'string') {
        return [column.column]
      }

      return []
    }

    return column.flatMap((item) => {
      if (typeof item === 'string') {
        return [item]
      }

      if (item && typeof item === 'object' && typeof item.column === 'string') {
        return [item.column]
      }

      return []
    })
  }

  /**
   * Extract string columns from groupBy inputs.
   */
  private getGroupByColumns(columns: any[]): string[] {
    return columns.flatMap((item) => {
      if (typeof item === 'string') {
        return [item]
      }

      if (Array.isArray(item)) {
        return item.filter((entry) => typeof entry === 'string')
      }

      return []
    })
  }

  /**
   * Raises for unsupported arithmetic operations on encrypted columns.
   */
  private ensureEncryptedArithmeticSupport(key: any, method: string) {
    this.encryptedSupport.ensureArithmeticSupport(key, method)
  }

  /**
   * Raises for unsupported column-vs-column comparisons on encrypted columns.
   */
  private ensureEncryptedColumnComparisonSupport(
    method: string,
    column: any,
    comparisonColumn: any
  ) {
    this.encryptedSupport.ensureColumnComparisonSupport(method, column, comparisonColumn)
  }

  /**
   * Prepares update payload by applying encrypted column transforms.
   */
  private prepareUpdateValues(values: Dictionary<any, string>): Dictionary<any, string> {
    return this.encryptedSupport.prepareUpdateValues(
      values,
      (key) => this.resolveKey(key),
      (rawValue) => this.transformRaw(rawValue)
    )
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

  groupBy(...columns: any[]): this {
    this.getGroupByColumns(columns).forEach((column) => {
      this.ensureEncryptedMethodSupport(column, 'groupBy')
    })

    return super.groupBy(...columns)
  }

  orderBy(column: any, direction?: any): this {
    this.getOrderByColumns(column).forEach((item) => {
      this.ensureEncryptedMethodSupport(item, 'orderBy')
    })

    return super.orderBy(column, direction)
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
    this.ensureEncryptedArithmeticSupport(column, 'increment')
    this.knexQuery.increment(this.resolveKey(column, true), counter)
    return this
  }

  /**
   * Perform update by decrementing value for a given column. Decrements
   * can be clubbed with `update` as well
   */
  decrement(column: any, counter?: any): any {
    this.ensureCanPerformWrites()
    this.ensureEncryptedArithmeticSupport(column, 'decrement')
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

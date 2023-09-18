/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { Exception } from '@poppinss/utils'

import {
  LucidRow,
  LucidModel,
  ModelObject,
  ModelAdapterOptions,
  ModelQueryBuilderContract,
} from '../../../adonis-typings/model.js'

import {
  PreloaderContract,
  RelationshipsContract,
  RelationQueryBuilderContract,
} from '../../../adonis-typings/relations.js'

import {
  DialectContract,
  QueryClientContract,
  TransactionClientContract,
} from '../../../adonis-typings/database.js'

import { DBQueryCallback, Dictionary, OneOrMany } from '../../../adonis-typings/querybuilder.js'

import { isObject } from '../../utils/index.js'
import { Preloader } from '../preloader/index.js'
import { ModelPaginator } from '../paginator/index.js'
import { QueryRunner } from '../../query_runner/index.js'
import { Chainable } from '../../database/query_builder/chainable.js'
import { SimplePaginator } from '../../database/paginator/simple_paginator.js'

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
   * Sideloaded attributes that will be passed to the model instances
   */
  protected sideloaded: ModelObject = {}

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
   * Control whether or not to wrap adapter result to model
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
   * Whether or not query is a subquery for `.where` callback
   */
  isChildQuery = false

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
   * Defines sub query for checking the existance of a relationship
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
      throw new Exception(
        `"${name}" is not defined as a relationship on "${this.model.name}" model`,
        {
          status: 500,
          code: 'E_UNDEFINED_RELATIONSHIP',
        }
      )
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
   * Set sideloaded properties to be passed to the model instance
   */
  sideload(value: ModelObject) {
    this.sideloaded = value
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
      throw new Exception('Row not found', { status: 404, code: 'E_ROW_NOT_FOUND' })
    }

    return row
  }

  /**
   * Load aggregate value as a subquery for a relationship
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
     * Count subquery selection
     */
    this.select(subQuery.prepare())

    /**
     * Bump the counter
     */
    this.joinCounter++

    return this
  }

  /**
   * Get count of a relationship along side the main query results
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
       * Define alias for the subquery
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

    if (value === undefined && returning === undefined) {
      this.knexQuery.update(this.resolveKey(column, true))
    } else if (returning === undefined) {
      this.knexQuery.update(this.resolveKey(column), value)
    } else {
      this.knexQuery.update(this.resolveKey(column), value, returning)
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
   * Run query inside the given transaction
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
  finally(fullfilled: any) {
    return this.exec().finally(fullfilled)
  }

  /**
   * Required when Promises are extended
   */
  get [Symbol.toStringTag]() {
    return this.constructor.name
  }
}

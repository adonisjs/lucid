/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Knex } from 'knex'
import { DialectContract, QueryClientContract, TransactionClientContract } from './database.js'

/**
 * Extracted from ts-essentials
 */
export type Dictionary<T, K extends string | number = string> = { [key in K]: T }

/**
 * Get one or many of a generic
 */
export type OneOrMany<T> = T | T[]

/**
 * Allowing a generic value along with raw query instance or a subquery
 * instance
 */
export type ValueWithSubQueries<T> = T | ChainableContract | RawQuery

/**
 * Acceptable raw queries
 */
export type RawQuery =
  | RawBuilderContract
  | RawQueryBuilderContract
  | Knex.Raw
  | Knex.RawQueryBuilder

/**
 * A known set of values allowed when defining values for different
 * clauses
 */
export type StrictValues =
  | string
  | number
  | boolean
  | Date
  | Array<string>
  | Array<number>
  | Array<Date>
  | Array<boolean>
  | Buffer
  | RawQuery
  | ReferenceBuilderContract

/**
 * Strict set of allowed values except the raw queries
 */
export type StrictValuesWithoutRaw = Exclude<StrictValues, RawQuery>

/**
 * Shape of raw query bindings
 */
export type RawQueryBindings = { [key: string]: StrictValues } | StrictValues[]

/**
 * A builder method to allow raw queries. However, the return type is the
 * instance of current query builder. This is used for `.{verb}Raw` methods.
 */
export interface RawQueryFn<Builder extends ChainableContract> {
  (sql: string | RawQuery): Builder
  (sql: string, bindings: RawQueryBindings): Builder
}

/**
 * Query callback is used to write wrapped queries. We get rid of `this` from
 * knex, since it makes everything confusing.
 */
export type QueryCallback<Builder extends ChainableContract> = (builder: Builder) => void

/**
 * Shape of the function accepted by the chainable query builder to
 * pass lucid query builder to wrapped callbacks like
 * `.where(function () {})`.
 *
 * - This method will accept the wrapped callback
 * - Return a new method, that is accepted by Knex.
 * - When knex calls that method, this method will invoke the user wrapped
 *   callback, but instead of passing the knex query builder, it will
 *   pass the appropriate lucid query builder.
 */
export type DBQueryCallback = (
  userFn: QueryCallback<ChainableContract>,
  keysResolver?: (columnName: string) => string
) => (builder: Knex.QueryBuilder) => void

/**
 * Possible signatures for a select method on database query builder.
 */
export interface DatabaseQueryBuilderSelect<Builder extends ChainableContract> {
  /**
   * Selecting columns as a dictionary with key as the alias and value is
   * the original column.
   */
  (columns: Dictionary<string, string>): Builder

  /**
   * An array of values with subqueries
   */
  (columns: ValueWithSubQueries<string | number>[]): Builder

  /**
   * A spread of array arguments
   */
  (...columns: ValueWithSubQueries<string | number>[]): Builder

  /**
   * Wildcard selector.
   */
  (column: '*'): Builder
}

/**
 * Possible signatures for adding a where clause
 */
export interface Where<Builder extends ChainableContract> {
  /**
   * Callback for wrapped clauses
   */
  (callback: QueryCallback<Builder>): Builder

  /**
   * Passing an object of named key-value pair
   */
  (clause: Dictionary<any, string>): Builder

  /**
   * Key-value pair. The value can also be a subquery
   */
  (key: string | RawQuery, value: StrictValues | ChainableContract): Builder
  (key: string | RawQuery, operator: string, value: StrictValues | ChainableContract): Builder
}

/**
 * Possible signatures for adding a whereLike clause
 */
export interface WhereLike<Builder extends ChainableContract> {
  /**
   * Key-value pair. The value can also be a subquery
   */
  (key: string, value: StrictValues | ChainableContract): Builder
}

/**
 * Possible signatures for adding a whereLike clause
 */
export interface WhereJson<Builder extends ChainableContract> {
  /**
   * Key-value pair. The value can also be a subquery
   */
  (column: string, value: Record<string, any> | ChainableContract | QueryCallback<Builder>): Builder
}

export interface WhereJsonPath<Builder extends ChainableContract> {
  (
    column: string,
    jsonPath: string,
    value:
      | string
      | number
      | boolean
      | string[]
      | number[]
      | boolean[]
      | Record<string, any>
      | ChainableContract
      | QueryCallback<Builder>
  ): Builder
  (
    column: string,
    jsonPath: string,
    operator: string,
    value:
      | string
      | number
      | boolean
      | string[]
      | number[]
      | boolean[]
      | Record<string, any>
      | ChainableContract
      | QueryCallback<Builder>
  ): Builder
}

/**
 * Possible signatures for adding a where column clause
 */
export interface WhereColumn<Builder extends ChainableContract> {
  /**
   * Key-value pair.
   */
  (column: string | RawQuery, comparisonColumn: string): Builder
  (column: string | RawQuery, operator: string, comparisonColumn: string): Builder
}

/**
 * Possible signatures for adding where in clause.
 */
export interface WhereIn<Builder extends ChainableContract> {
  /**
   * Column name and array of values
   */
  (K: string | RawQuery, value: StrictValues[]): Builder

  /**
   * Column names and array of values as an 2d array
   */
  (K: string[], value: StrictValues[][]): Builder

  (k: string | RawQuery, callback: QueryCallback<Builder>): Builder

  /**
   * Column name with a subquery for a callback that yields an array of
   * results
   */
  (k: string | RawQuery, subquery: ChainableContract | RawBuilderContract | RawQuery): Builder

  /**
   * Column names along with a subquery that yields an array
   */
  (k: string[], subquery: ChainableContract | RawBuilderContract | RawQuery): Builder
}

/**
 * Possible signatures for adding whereNull clause.
 */
export interface WhereNull<Builder extends ChainableContract> {
  (key: string | RawQuery): Builder
}

/**
 * Possibles signatures for adding a where exists clause
 */
export interface WhereExists<Builder extends ChainableContract> {
  (callback: QueryCallback<Builder>): Builder
  (callback: ChainableContract | RawBuilderContract | RawQuery): Builder
}

/**
 * Possibles signatures for adding a where between clause
 */
export interface WhereBetween<Builder extends ChainableContract> {
  /**
   * Accept any string as a key for supporting prefix columns
   */
  (
    key: string | RawQuery,
    value: [StrictValues | ChainableContract, StrictValues | ChainableContract]
  ): Builder
}

/**
 * Possible signatures for join query
 */
export interface Join<Builder extends ChainableContract> {
  /**
   * Defining the join table with primary and secondary columns
   * to match
   */
  (table: string, primaryColumn: string, secondaryColumn: string): Builder

  /**
   * Defining the join table with primary and secondary columns
   * to match, where secondary column is output of a raw query
   */
  (table: string, primaryColumn: string, raw: RawQuery): Builder

  /**
   * Defining the join table with primary and secondary columns
   * to match with a custom operator
   */
  (table: string, primaryColumn: string, operator: string, secondaryColumn: string): Builder

  /**
   * Join with a callback. The callback receives an array of join class from
   * knex directly.
   */
  (table: string, callback: Knex.JoinCallback): Builder
}

/**
 * Possible signatures for a distinct clause
 */
export interface Distinct<Builder extends ChainableContract> {
  (columns: string[]): Builder
  (...columns: string[]): Builder
  (column: '*'): Builder
}

/**
 * The signatures are same as the `distinct` method. For subqueries and
 * raw queries, one must use `groupByRaw`.
 */
export interface GroupBy<Builder extends ChainableContract> extends Distinct<Builder> {}

/**
 * Possible signatures for aggregate functions. Aggregates will push to the
 * result set. Unlike knex, we force defining aliases for each aggregate.
 */
export interface Aggregate<Builder extends ChainableContract> {
  /**
   * Accepting column with the alias for the count.
   */
  (column: OneOrMany<ValueWithSubQueries<string>>, alias?: string): Builder

  /**
   * Accepting an object for multiple counts in a single query.
   */
  (columns: Dictionary<OneOrMany<ValueWithSubQueries<string>>, string>): Builder
}

/**
 * Possible signatures for orderBy method.
 */
export interface OrderBy<Builder extends ChainableContract> {
  /**
   * Order by a column and optional direction
   */
  (
    column: string | ChainableContract | RawBuilderContract | RawQuery,
    direction?: 'asc' | 'desc'
  ): Builder

  /**
   * Order by multiple columns in default direction
   */
  (columns: string[]): Builder

  /**
   * Order by multiple columns and custom direction for each of them
   */
  (
    columns: {
      column: string | ChainableContract | RawBuilderContract | RawQuery
      order?: 'asc' | 'desc'
    }[]
  ): Builder
}

/**
 * Possible signatures for a union clause
 */
export interface Union<Builder extends ChainableContract> {
  (callback: OneOrMany<QueryCallback<Builder>>, wrap?: boolean): Builder
  (subquery: OneOrMany<ChainableContract | RawQuery>, wrap?: boolean): Builder
}

/**
 * Same signature as union
 */
interface UnionAll<Builder extends ChainableContract> extends Union<Builder> {}

/**
 * Same signature as union
 */
export interface Intersect<Builder extends ChainableContract> extends Union<Builder> {}

/**
 * Possible signatures for having clause
 */
export interface Having<Builder extends ChainableContract> {
  /**
   * A subquery callback
   */
  (callback: QueryCallback<Builder>): Builder
  (callback: RawBuilderContract | RawQuery): Builder

  /**
   * Key operator and value. Value can be a subquery as well
   */
  (
    key: string | RawQuery,
    operator: string,
    value: StrictValues | ChainableContract | RawBuilderContract | RawQuery
  ): Builder
}

/**
 * Possible signatures for `having in` clause.
 */
export interface HavingIn<Builder extends ChainableContract> {
  /**
   * Key and an array of literal values, raw queries or
   * subqueries.
   */
  (
    key: string | RawQuery,
    value: (StrictValues | ChainableContract | RawBuilderContract | RawQuery)[]
  ): Builder

  /**
   * Key, along with a query callback
   */
  (key: string | RawQuery, callback: QueryCallback<Builder>): Builder
}

/**
 * Possible signatures for `having null` clause
 */
export interface HavingNull<Builder extends ChainableContract> extends WhereNull<Builder> {}

/**
 * Possible signatures for `having exists` clause
 */
export interface HavingExists<Builder extends ChainableContract> {
  /**
   * A query callback or a sub query
   */
  (callback: QueryCallback<Builder> | ChainableContract): Builder
}

/**
 * Possible signatures for having between
 */
export interface HavingBetween<Builder extends ChainableContract> extends WhereBetween<Builder> {}

/**
 * Possible signatures of `with` CTE
 */
export interface With<Builder extends ChainableContract> {
  (alias: string, callback: QueryCallback<Builder>, columns?: string[]): Builder
  (alias: string, query: RawQuery | ChainableContract, columns?: string[]): Builder
}

/**
 * Possible signatures for defining table for a select query.
 */
export interface FromTable<Builder extends ChainableContract> {
  (table: string | Dictionary<string, string> | QueryCallback<Builder> | ChainableContract): Builder
}

/**
 * Possible signatures for the `returning` method.
 */
export interface Returning<Builder> {
  (column: OneOrMany<string>): Builder
}

/**
 * Possible signatures for performing an update
 */
export interface Update<Builder extends ChainableContract> {
  /**
   * Accepts an array of object of named key/value pair and returns an array
   * of Generic return columns.
   */
  (values: Dictionary<any, string>, returning?: OneOrMany<string>): Builder

  /**
   * Accepts a key-value pair to update.
   */
  (column: string, value: any, returning?: OneOrMany<string>): Builder
}

/**
 * Possible signatures for incrementing/decrementing
 * values
 */
export interface Counter<Builder extends ChainableContract> {
  (column: string, counter?: number): Builder
  (values: Dictionary<number, string>): Builder
}

/**
 * Possible signatures for an insert query
 */
export interface Insert<Builder extends InsertQueryBuilderContract> {
  (values: Dictionary<any, string>): Builder
}

/**
 * Possible signatures for doing multiple inserts in a single query
 */
export interface MultiInsert<Builder extends InsertQueryBuilderContract> {
  (values: Dictionary<any, string>[]): Builder
}

/**
 * The chainable contract has all the methods that can be chained
 * to build a query. This interface will never have any
 * methods to execute a query.
 */
export interface ChainableContract {
  knexQuery: Knex.QueryBuilder
  columns: (string | Knex.QueryBuilder | Knex.RawQueryBuilder)[]
  subQueryAlias?: string
  hasAggregates: boolean
  hasGroupBy: boolean
  hasUnion: boolean
  keysResolver?: (columnName: string) => string

  from: FromTable<this>
  select: DatabaseQueryBuilderSelect<this>

  wrapExisting(): this

  where: Where<this>
  orWhere: Where<this>
  andWhere: Where<this>

  whereNot: Where<this>
  orWhereNot: Where<this>
  andWhereNot: Where<this>

  whereColumn: WhereColumn<this>
  orWhereColumn: WhereColumn<this>
  andWhereColumn: WhereColumn<this>

  whereNotColumn: WhereColumn<this>
  orWhereNotColumn: WhereColumn<this>
  andWhereNotColumn: WhereColumn<this>

  whereIn: WhereIn<this>
  orWhereIn: WhereIn<this>
  andWhereIn: WhereIn<this>

  whereNotIn: WhereIn<this>
  orWhereNotIn: WhereIn<this>
  andWhereNotIn: WhereIn<this>

  whereNull: WhereNull<this>
  orWhereNull: WhereNull<this>
  andWhereNull: WhereNull<this>

  whereNotNull: WhereNull<this>
  orWhereNotNull: WhereNull<this>
  andWhereNotNull: WhereNull<this>

  whereExists: WhereExists<this>
  orWhereExists: WhereExists<this>
  andWhereExists: WhereExists<this>

  whereNotExists: WhereExists<this>
  orWhereNotExists: WhereExists<this>
  andWhereNotExists: WhereExists<this>

  whereBetween: WhereBetween<this>
  orWhereBetween: WhereBetween<this>
  andWhereBetween: WhereBetween<this>

  whereNotBetween: WhereBetween<this>
  orWhereNotBetween: WhereBetween<this>
  andWhereNotBetween: WhereBetween<this>

  whereRaw: RawQueryFn<this>
  orWhereRaw: RawQueryFn<this>
  andWhereRaw: RawQueryFn<this>

  whereLike: WhereLike<this>
  orWhereLike: WhereLike<this>
  andWhereLike: WhereLike<this>

  whereILike: WhereLike<this>
  orWhereILike: WhereLike<this>
  andWhereILike: WhereLike<this>

  whereJson: WhereJson<this>
  orWhereJson: WhereJson<this>
  andWhereJson: WhereJson<this>

  whereNotJson: WhereJson<this>
  orWhereNotJson: WhereJson<this>
  andWhereNotJson: WhereJson<this>

  whereJsonSuperset: WhereJson<this>
  orWhereJsonSuperset: WhereJson<this>
  andWhereJsonSuperset: WhereJson<this>

  whereNotJsonSuperset: WhereJson<this>
  orWhereNotJsonSuperset: WhereJson<this>
  andWhereNotJsonSuperset: WhereJson<this>

  whereJsonSubset: WhereJson<this>
  orWhereJsonSubset: WhereJson<this>
  andWhereJsonSubset: WhereJson<this>

  whereNotJsonSubset: WhereJson<this>
  orWhereNotJsonSubset: WhereJson<this>
  andWhereNotJsonSubset: WhereJson<this>

  whereJsonPath: WhereJsonPath<this>
  orWhereJsonPath: WhereJsonPath<this>
  andWhereJsonPath: WhereJsonPath<this>

  join: Join<this>
  innerJoin: Join<this>
  leftJoin: Join<this>
  leftOuterJoin: Join<this>
  rightJoin: Join<this>
  rightOuterJoin: Join<this>
  fullOuterJoin: Join<this>
  crossJoin: Join<this>
  joinRaw: RawQueryFn<this>

  having: Having<this>
  orHaving: Having<this>
  andHaving: Having<this>

  havingIn: HavingIn<this>
  orHavingIn: HavingIn<this>
  andHavingIn: HavingIn<this>

  havingNotIn: HavingIn<this>
  orHavingNotIn: HavingIn<this>
  andHavingNotIn: HavingIn<this>

  havingNull: HavingNull<this>
  orHavingNull: HavingNull<this>
  andHavingNull: HavingNull<this>

  havingNotNull: HavingNull<this>
  orHavingNotNull: HavingNull<this>
  andHavingNotNull: HavingNull<this>

  havingExists: HavingExists<this>
  orHavingExists: HavingExists<this>
  andHavingExists: HavingExists<this>

  havingNotExists: HavingExists<this>
  orHavingNotExists: HavingExists<this>
  andHavingNotExists: HavingExists<this>

  havingBetween: HavingBetween<this>
  orHavingBetween: HavingBetween<this>
  andHavingBetween: HavingBetween<this>

  havingNotBetween: HavingBetween<this>
  orHavingNotBetween: HavingBetween<this>
  andHavingNotBetween: HavingBetween<this>

  havingRaw: RawQueryFn<this>
  orHavingRaw: RawQueryFn<this>
  andHavingRaw: RawQueryFn<this>

  distinct: Distinct<this>
  distinctOn: Distinct<this>

  groupBy: GroupBy<this>
  groupByRaw: RawQueryFn<this>

  orderBy: OrderBy<this>
  orderByRaw: RawQueryFn<this>

  union: Union<this>
  unionAll: UnionAll<this>

  intersect: Intersect<this>

  with: With<this>
  withRecursive: With<this>
  withMaterialized: With<this>
  withNotMaterialized: With<this>

  withSchema(schema: string): this
  as(name: string): this

  offset(offset: number): this
  limit(limit: number): this

  clearSelect(): this
  clearWhere(): this
  clearOrder(): this
  clearHaving(): this
  clearLimit(): this
  clearOffset(): this

  forUpdate(...tableNames: string[]): this
  forShare(...tableNames: string[]): this

  skipLocked(): this
  noWait(): this

  /**
   * Executes the callback when condition is truthy
   */
  if(
    condition: any,
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this

  /**
   * Executes the callback when condition is falsy
   */
  unless(
    condition: any,
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this

  /**
   * Write blocks to match from
   */
  match(
    ...blocks: ([condition: any, callback: (query: this) => any] | ((query: this) => any))[]
  ): this
}

/**
 * Shape of the raw query that can also be passed as a value to
 * other queries
 */
export interface RawQueryBuilderContract<Result = any>
  extends ExcutableQueryBuilderContract<Result> {
  knexQuery: Knex.Raw
  client: QueryClientContract
  wrap(before: string, after: string): this
}

/**
 * Reference builder
 */
export interface ReferenceBuilderContract {
  withSchema(name: string): this
  as(name: string): this
  toKnex(client: Knex.Client): Knex.Ref<string, any>
}

/**
 * Static raw builder
 */
export interface RawBuilderContract {
  wrap(before: string, after: string): this
  toKnex(client: Knex.Client): Knex.Raw
}

/**
 * The keys for the simple paginator meta
 * data
 */
export type SimplePaginatorMetaKeys = {
  total: string
  perPage: string
  currentPage: string
  lastPage: string
  firstPage: string
  firstPageUrl: string
  lastPageUrl: string
  nextPageUrl: string
  previousPageUrl: string
}

/**
 * Shape of the simple paginator that works with offset and limit
 */
export interface SimplePaginatorContract<Result> extends Array<Result> {
  all(): Result[]
  readonly firstPage: number
  readonly perPage: number
  readonly currentPage: number
  readonly lastPage: number
  readonly hasPages: boolean
  readonly hasMorePages: boolean
  readonly isEmpty: boolean
  readonly total: number
  readonly hasTotal: boolean
  namingStrategy: {
    paginationMetaKeys(): SimplePaginatorMetaKeys
  }
  baseUrl(url: string): this
  queryString(values: { [key: string]: any }): this
  getUrl(page: number): string
  getMeta(): any
  getNextPageUrl(): string | null
  getPreviousPageUrl(): string | null
  getUrlsForRange(start: number, end: number): { url: string; page: number; isActive: boolean }[]
  toJSON(): { meta: any; data: Result[] }
}

/**
 * Database query builder exposes the API to construct SQL query using fluent
 * chainable API
 */
export interface DatabaseQueryBuilderContract<Result = Dictionary<any, string>>
  extends ChainableContract,
    ExcutableQueryBuilderContract<Result[]> {
  client: QueryClientContract
  returning: Returning<this>

  /**
   * Clone current query
   */
  clone<ClonedResult = Result>(): DatabaseQueryBuilderContract<ClonedResult>

  /**
   * Execute and get first result
   */
  first(): Promise<Result | null>

  /**
   * Execute and get first result or fail
   */
  firstOrFail(): Promise<Result>

  /**
   * Perform delete operation
   */
  del(returning?: OneOrMany<string>): this
  delete(returning?: OneOrMany<string>): this

  /**
   * A shorthand to define limit and offset based upon the
   * current page
   */
  forPage(page: number, perPage?: number): this

  /**
   * Execute query with pagination
   */
  paginate(page: number, perPage?: number): Promise<SimplePaginatorContract<Result>>

  /**
   * Mutations (update and increment can be one query aswell)
   */
  update: Update<this>
  increment: Counter<this>
  decrement: Counter<this>

  /**
   * Aggregates
   */
  count: Aggregate<this>
  countDistinct: Aggregate<this>
  min: Aggregate<this>
  max: Aggregate<this>
  sum: Aggregate<this>
  sumDistinct: Aggregate<this>
  avg: Aggregate<this>
  avgDistinct: Aggregate<this>

  /**
   * Executes the callback when dialect matches one of the mentioned
   * dialects
   */
  ifDialect(
    dialect: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this

  /**
   * Executes the callback when dialect matches doesn't all the mentioned
   * dialects
   */
  unlessDialect(
    dialect: DialectContract['name'] | DialectContract['name'][],
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this
}

/**
 * Insert query builder to perform database inserts.
 */
export interface InsertQueryBuilderContract<Result = any>
  extends ExcutableQueryBuilderContract<Result> {
  knexQuery: Knex.QueryBuilder
  client: QueryClientContract

  /**
   * Table for the insert query
   */
  table(table: string): this
  withSchema(schema: string): this

  /**
   * Define returning columns
   */
  returning: Returning<this>

  /**
   * Inserting a single record.
   */
  insert: Insert<this>

  /**
   * Inserting multiple columns at once
   */
  multiInsert: MultiInsert<this>
}

/**
 * A executable query builder will always have these methods on it.
 */
export interface ExcutableQueryBuilderContract<Result> extends Promise<Result> {
  debug(debug: boolean): this
  timeout(time: number, options?: { cancel: boolean }): this
  /**
   * @deprecated
   * Do not use this method. Instead create a query with options.client
   *
   * ```ts
   * Model.query({ client: trx })
   * Database.query({ client: trx })
   * ```
   */
  useTransaction(trx: TransactionClientContract): this
  reporterData(data: any): this
  toQuery(): string
  exec(): Promise<Result>
  toSQL(): Knex.Sql
}

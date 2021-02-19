/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/DatabaseQueryBuilder' {
  import knex from 'knex'
  import {
    DialectContract,
    QueryClientContract,
    TransactionClientContract,
  } from '@ioc:Adonis/Lucid/Database'

  /**
   * Extracted from ts-essentials
   */
  type Dictionary<T, K extends string | number = string> = { [key in K]: T }

  /**
   * Get one or many of a generic
   */
  type OneOrMany<T> = T | T[]

  /**
   * Allowing a generic value along with raw query instance or a subquery
   * instance
   */
  export type ValueWithSubQueries<T extends any> = T | ChainableContract | RawQuery

  /**
   * Acceptable raw queries
   */
  export type RawQuery = RawBuilderContract | RawQueryBuilderContract

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
  interface RawQueryFn<Builder extends ChainableContract> {
    (sql: string | RawQuery): Builder
    (sql: string, bindings: RawQueryBindings): Builder
  }

  /**
   * Query callback is used to write wrapped queries. We get rid of `this` from
   * knex, since it makes everything confusing.
   */
  type QueryCallback<Builder extends any> = (builder: Builder) => void

  /**
   * Shape of the function accepted by the chainable query builder to
   * pass lucid query builder to wrapped callbacks like
   * `.where(function () {})`.
   *
   * - This method will accept the wrapped callback
   * - Return a new method, that is accepted by knex.
   * - When knex calls that method, this method will invoke the user wrapped
   *   callback, but instead of passing the knex query builder, it will
   *   pass the appropriate lucid query builder.
   */
  type DBQueryCallback = (
    userFn: QueryCallback<ChainableContract>,
    keysResolver?: (columnName: string) => string
  ) => (builder: knex.QueryBuilder) => void

  /**
   * Possible signatures for a select method on database query builder.
   */
  interface DatabaseQueryBuilderSelect<Builder extends ChainableContract> {
    /**
     * Selecting columns as a dictionary with key as the alias and value is
     * the original column.
     */
    (columns: Dictionary<string, string>): Builder

    /**
     * An array of values with subqueries
     */
    (columns: ValueWithSubQueries<string>[]): Builder

    /**
     * A spread of array arguments
     */
    (...columns: ValueWithSubQueries<string>[]): Builder

    /**
     * Wildcard selector.
     */
    (column: '*'): Builder
  }

  /**
   * Possible signatures for adding a where clause
   */
  interface Where<Builder extends ChainableContract> {
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
    (key: string, value: StrictValues | ChainableContract): Builder
    (key: string, operator: string, value: StrictValues | ChainableContract): Builder
  }

  /**
   * Possible signatures for adding a where column clause
   */
  interface WhereColumn<Builder extends ChainableContract> {
    /**
     * Key-value pair.
     */
    (column: string, comparisonColumn: string): Builder
    (column: string, operator: string, comparisonColumn: string): Builder
  }

  /**
   * Possible signatures for adding where in clause.
   */
  interface WhereIn<Builder extends ChainableContract> {
    /**
     * Column name and array of values
     */
    (K: string, value: StrictValues[]): Builder

    /**
     * Column names and array of values as an 2d array
     */
    (K: string[], value: StrictValues[][]): Builder

    /**
     * Column name with a subquery for a callback that yields an array of
     * results
     */
    (
      k: string,
      subquery: ChainableContract | QueryCallback<Builder> | RawBuilderContract | RawQuery
    ): Builder

    /**
     * Column names along with a subquery that yields an array
     */
    (k: string[], subquery: ChainableContract | RawBuilderContract | RawQuery): Builder
  }

  /**
   * Possible signatures for adding whereNull clause.
   */
  interface WhereNull<Builder extends ChainableContract> {
    (key: string): Builder
  }

  /**
   * Possibles signatures for adding a where exists clause
   */
  interface WhereExists<Builder extends ChainableContract> {
    (callback: QueryCallback<Builder> | ChainableContract | RawBuilderContract | RawQuery): Builder
  }

  /**
   * Possibles signatures for adding a where between clause
   */
  interface WhereBetween<Builder extends ChainableContract> {
    /**
     * Accept any string as a key for supporting prefix columns
     */
    (
      key: string,
      value: [StrictValues | ChainableContract, StrictValues | ChainableContract]
    ): Builder
  }

  /**
   * Possible signatures for join query
   */
  interface Join<Builder extends ChainableContract> {
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
    (table: string, callback: knex.JoinCallback): Builder
  }

  /**
   * Possible signatures for a distinct clause
   */
  interface Distinct<Builder extends ChainableContract> {
    (columns: string[]): Builder
    (...columns: string[]): Builder
    (column: '*'): Builder
  }

  /**
   * The signatures are same as the `distinct` method. For subqueries and
   * raw queries, one must use `groupByRaw`.
   */
  interface GroupBy<Builder extends ChainableContract> extends Distinct<Builder> {}

  /**
   * Possible signatures for aggregate functions. Aggregates will push to the
   * result set. Unlike knex, we force defining aliases for each aggregate.
   */
  interface Aggregate<Builder extends ChainableContract> {
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
  interface OrderBy<Builder extends ChainableContract> {
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
  interface Union<Builder extends ChainableContract> {
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
  interface Intersect<Builder extends ChainableContract> extends Union<Builder> {}

  /**
   * Possible signatures for having clause
   */
  interface Having<Builder extends ChainableContract> {
    /**
     * A subquery callback
     */
    (callback: QueryCallback<Builder> | RawBuilderContract | RawQuery): Builder

    /**
     * Key operator and value. Value can be a subquery as well
     */
    (
      key: string,
      operator: string,
      value: StrictValues | ChainableContract | RawBuilderContract | RawQuery
    ): Builder
  }

  /**
   * Possible signatures for `having in` clause.
   */
  interface HavingIn<Builder extends ChainableContract> {
    /**
     * Key and an array of literal values, raw queries or
     * subqueries.
     */
    (
      key: string,
      value: (StrictValues | ChainableContract | RawBuilderContract | RawQuery)[]
    ): Builder

    /**
     * Key, along with a query callback
     */
    (key: string, callback: QueryCallback<Builder>): Builder
  }

  /**
   * Possible signatures for `having null` clause
   */
  interface HavingNull<Builder extends ChainableContract> extends WhereNull<Builder> {}

  /**
   * Possible signatures for `having exists` clause
   */
  interface HavingExists<Builder extends ChainableContract> {
    /**
     * A query callback or a sub query
     */
    (callback: QueryCallback<Builder> | ChainableContract): Builder
  }

  /**
   * Possible signatures for having between
   */
  interface HavingBetween<Builder extends ChainableContract> extends WhereBetween<Builder> {}

  /**
   * Possible signatures of `with` CTE
   */
  interface With<Builder extends ChainableContract> {
    (alias: string, query: RawQuery | ChainableContract | QueryCallback<Builder>): Builder
  }

  /**
   * Possible signatures for defining table for a select query.
   */
  interface FromTable<Builder extends ChainableContract> {
    (
      table: string | Dictionary<string, string> | QueryCallback<Builder> | ChainableContract
    ): Builder
  }

  /**
   * Possible signatures for the `returning` method.
   */
  interface Returning<Builder> {
    (column: OneOrMany<string>): Builder
  }

  /**
   * Possible signatures for performing an update
   */
  interface Update<Builder extends ChainableContract> {
    /**
     * Accepts an array of object of named key/value pair and returns an array
     * of Generic return columns.
     */
    (values: Dictionary<any, string>, returning?: string | string[]): Builder

    /**
     * Accepts a key-value pair to update.
     */
    (column: string, value: any, returning?: string | string[]): Builder
  }

  /**
   * Possible signatures for incrementing/decrementing
   * values
   */
  interface Counter<Builder extends ChainableContract> {
    (column: string, counter?: number): Builder
    (values: Dictionary<number, string>): Builder
  }

  /**
   * Possible signatures for an insert query
   */
  interface Insert<Builder extends InsertQueryBuilderContract> {
    (values: Dictionary<any, string>): Builder
  }

  /**
   * Possible signatures for doing multiple inserts in a single query
   */
  interface MultiInsert<Builder extends InsertQueryBuilderContract> {
    (values: Dictionary<any, string>[]): Builder
  }

  /**
   * The chainable contract has all the methods that can be chained
   * to build a query. This interface will never have any
   * methods to execute a query.
   */
  export interface ChainableContract {
    knexQuery: knex.QueryBuilder
    columns: (string | knex.QueryBuilder | knex.RawQueryBuilder)[]
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
  export interface RawQueryBuilderContract<Result extends any = any>
    extends ExcutableQueryBuilderContract<Result> {
    knexQuery: knex.Raw
    client: QueryClientContract
    wrap(before: string, after: string): this
  }

  /**
   * Reference builder
   */
  export interface ReferenceBuilderContract {
    withSchema(name: string): this
    as(name: string): this
    toKnex(client: knex.Client): knex.Ref<string, any>
  }

  /**
   * Static raw builder
   */
  export interface RawBuilderContract {
    wrap(before: string, after: string): this
    toKnex(client: knex.Client): knex.Raw
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
  export interface SimplePaginatorContract<Result extends any> extends Array<Result> {
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
  export interface DatabaseQueryBuilderContract<Result extends any = Dictionary<any, string>>
    extends ChainableContract,
      ExcutableQueryBuilderContract<Result[]> {
    client: QueryClientContract

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
    del(): this
    delete(): this

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
  export interface InsertQueryBuilderContract<Result extends any = any>
    extends ExcutableQueryBuilderContract<Result> {
    knexQuery: knex.QueryBuilder
    client: QueryClientContract

    /**
     * Table for the insert query
     */
    table(table: string): this

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
  export interface ExcutableQueryBuilderContract<Result extends any> extends Promise<Result> {
    debug(debug: boolean): this
    timeout(time: number, options?: { cancel: boolean }): this
    useTransaction(trx: TransactionClientContract): this
    reporterData(data: any): this
    toQuery(): string
    exec(): Promise<Result>
    toSQL(): knex.Sql
  }
}

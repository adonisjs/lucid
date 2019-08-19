/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Addons/DatabaseQueryBuilder' {
  import * as knex from 'knex'
  import { Dictionary } from 'ts-essentials'
  import { ProfilerRowContract, ProfilerContract } from '@poppinss/profiler'

  /**
   * The types for values for the aggregates. We need this coz of
   * the history with bigints in Javascript
   */
  export interface AggregatesRegistry {
    Count: number,
  }

  /**
   * Get one or many of a generic
   */
  type OneOrMany<T> = T | T[]

  /**
   * Allowing a generic value along with raw query instance or a subquery
   * instance
   */
  type ValueWithSubQueries<T extends any> = T | ChainableContract<any> | RawContract

  /**
   * A known set of values allowed when defining values for different
   * clauses
   */
  type StrictValues =
    | string
    | number
    | boolean
    | Date
    | Array<string>
    | Array<number>
    | Array<Date>
    | Array<boolean>
    | Buffer
    | RawContract

  /**
   * Shape of raw query builder. The builder is a method used to build
   * raw queries.
   */
  interface RawBuilderContract {
    (sql: string): RawContract
    (sql: string, bindings: { [key: string]: Exclude<StrictValues, RawContract> }): RawContract
    (sql: string, bindings: Exclude<StrictValues, RawContract>[]): RawContract
  }

  /**
   * A builder method to allow raw queries. However, the return type is the
   * instance of current query builder. This is used for `.{verb}Raw` methods.
   */
  interface RawQueryBuilderContract<Builder extends ChainableContract> {
    (sql: string): Builder
    (sql: string, bindings: { [key: string]: Exclude<StrictValues, RawContract> }): Builder
    (sql: string, bindings: Exclude<StrictValues, RawContract>[]): Builder
    (sql: RawContract): Builder
  }

  /**
   * Query callback is used to write wrapped queries. We get rid of `this` from
   * knex, since it makes everything confusing.
   */
  type QueryCallback<Builder extends ChainableContract> = (
    (builder: Builder) => void
  )

  /**
   * Possible signatures for a select method on database query builder. The select narrows the result
   * based upon many factors.
   *
   * 1. select(*) uses the main result generic. Which means everything is returned.
   * 2. select(columns) narrows the result set to explicitly defined keys.
   * 3. Calling `select(columns)` for multiple times appends to the explicit result set.
   * 4. Calling `select(*)` after named selects will append all columns to the named columns.
   * 5. Aliases defined as object will return typed output.
   */
  interface DatabaseQueryBuilderSelect<
    Builder extends ChainableContract<any>,
    Record extends Dictionary<any, string>,
  > {
    /**
     * Selecting named columns as array
     */
    <K extends keyof Record> (columns: K[]): Builder

    /**
     * Selecting named columns as spread
     */
    <K extends keyof Record> (...columns: K[]): Builder

    /**
     * Selecting columns as a dictionary with key as the alias and value is
     * the original column. When aliases are defined, the return output
     * will have the alias columns and not the original one's
     */
    <K extends keyof Record> (columns: Dictionary<K, string>): Builder

    /**
     * String fallback when columns to be selected aren't derived from
     * record. Here we allow subqueries, raw queries or an array
     * of strings.
     */
    (columns: ValueWithSubQueries<string>[]): Builder

    /**
     * Selecting columns as spread
     */
    (...columns: ValueWithSubQueries<string>[]): Builder

    /**
     * Wildcard selector. Fallback to original `Result` type, since we are
     * selecting everything.
     */
    (column: '*'): Builder
  }

  /**
   * Possible signatures for adding a where clause
   */
  interface Where<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * Callback for wrapped clauses
     */
    (callback: QueryCallback<Builder>): Builder

    /**
     * Passing an object of named key/value pair
     */
    (clause: Partial<Record>): Builder

    /**
     * Key/value pair with the same value type, a subquery or
     * a raw query
     */
    <K extends keyof Record> (
      key: K,
      value: ValueWithSubQueries<Record[K]>,
    ): Builder

    /**
     * key/value with operator
     */
    <K extends keyof Record> (
      key: K,
      operator: string,
      value: ValueWithSubQueries<Record[K]>,
    ): Builder

    /**
     * Accepting any string as a key for supporting `dot` aliases
     */
    (key: string, value: StrictValues | ChainableContract<any>): Builder
    (key: string, operator: string, value: StrictValues | ChainableContract<any>): Builder
  }

  /**
   * Possible signatures for adding where in clause.
   */
  interface WhereIn<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * A named column as the key and an array of values including a literal
     * value, a raw query or a sub query.
     */
    <K extends keyof Record> (
      key: K,
      value: ValueWithSubQueries<Record[K]>[],
    ): Builder

    /**
     * A named column as the key along with a sub query. The subquery must yield
     * an array of values to be valid at runtime
     */
    <K extends keyof Record> (key: K, value: ChainableContract<any> | QueryCallback<Builder>): Builder

    /**
     * Accepting multiple columns and 2d array of values. The values must be
     * a nested array of literal values, a raw query or a subquery.
     *
     * Since Typescript doesn't have support for Variadic arguments, we need to
     * create multiple generics to support major use cases.
     */
    <K extends (keyof Record)[], A extends K[0]> (
      key: [A],
      value: [ValueWithSubQueries<Record[A]>][],
    ): Builder

    /**
     * two columns and their mapped values
     */
    <K extends (keyof Record)[], A extends K[0], B extends K[1]> (
      key: [A, B],
      value: [ValueWithSubQueries<Record[A]>, ValueWithSubQueries<Record[B]>][],
    ): Builder

    /**
     * three columns and their mapped values
     */
    <K extends (keyof Record)[], A extends K[0], B extends K[1], C extends K[2]> (
      key: [A, B, C],
      value: [
        ValueWithSubQueries<Record[A]>,
        ValueWithSubQueries<Record[B]>,
        ValueWithSubQueries<Record[C]>
      ][],
    ): Builder

    /**
     * four columns and their mapped values
     */
    <K extends (keyof Record)[], A extends K[0], B extends K[1], C extends K[2], D extends K[3]> (
      key: [A, B, C, D],
      value: [
        ValueWithSubQueries<Record[A]>,
        ValueWithSubQueries<Record[B]>,
        ValueWithSubQueries<Record[C]>,
        ValueWithSubQueries<Record[D]>
      ][],
    ): Builder

    /**
     * A subquery with an array of typed keys
     */
    <K extends keyof Record> (key: K[], subquery: ChainableContract<any>): Builder

    /**
     * Typed array of columns, with untyped values
     */
    <K extends keyof Record> (key: K[], value: (StrictValues | ChainableContract<any>)[][]): Builder

    /**
     * Allowing any string key (mainly for prefixed columns) with all
     * possible values
     */
    (K: string, value: (StrictValues | ChainableContract<any>)[]): Builder
    (K: string[], value: (StrictValues | ChainableContract<any>)[][]): Builder
    (k: string, subquery: ChainableContract<any> | QueryCallback<Builder>): Builder
    (k: string[], subquery: ChainableContract<any>): Builder
  }

  /**
   * Possible signatures for adding whereNull clause.
   */
  interface WhereNull<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    <K extends keyof Record> (key: K): Builder
    (key: string): Builder
  }

  /**
   * Possibles signatures for adding a where exists clause
   */
  interface WhereExists<Builder extends ChainableContract> {
    (callback: QueryCallback<Builder> | ChainableContract<any>): Builder
  }

  /**
   * Possibles signatures for adding a where between clause
   */
  interface WhereBetween<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * Typed column with an tuple of a literal value, a raw query or
     * a sub query
     */
    <K extends keyof Record> (key: K, value: [
      ValueWithSubQueries<Record[K]>,
      ValueWithSubQueries<Record[K]>,
    ]): Builder

    /**
     * Accept any string as a key for supporting prefix columns
     */
    (key: string, value: [
      StrictValues | ChainableContract<any>,
      StrictValues | ChainableContract<any>,
    ]): Builder
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
    (table: string, primaryColumn: string, raw: RawContract): Builder

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
  interface Distinct<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * Named keys
     */
    <K extends keyof Record> (columns: K[]): Builder

    /**
     * Named keys as spread
     */
    <K extends keyof Record> (...columns: K[]): Builder

    /**
     * An array of untyped strings
     */
    (columns: string[]): Builder

    /**
     * Spread of untyped strings
     */
    (...columns: string[]): Builder

    /**
     * Wildcard selector
     */
    (column: '*'): Builder
  }

  /**
   * The signatures are same as the `distinct` method. For subqueries and
   * raw queries, one must use `groupByRaw`.
   */
  interface GroupBy<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > extends Distinct<Builder, Record> {
  }

  /**
   * Possible signatures for aggregate functions. Aggregates will push to the
   * result set. Unlike knex, we force defining aliases for each aggregate.
   */
  interface Aggregate <
    Record extends Dictionary<any, string>,
    Result extends any,
  > {
    /**
     * Accepting a typed column with the alias for the count. Unlike knex
     * we enforce the alias, otherwise the output highly varies based
     * upon the driver in use
     */
    <K extends keyof Record, Alias extends string>(
      column: OneOrMany<K>,
      alias: Alias,
    ): DatabaseQueryBuilderContract<Record, Dictionary<AggregatesRegistry['Count'], Alias>>

    /**
     * Accepting an object for multiple counts in a single query. Again
     * aliases are enforced for consistency.
     */
    <
      K extends keyof Record,
      Alias extends string,
      Columns extends Dictionary<OneOrMany<K>, Alias>,
    >(
      columns: Columns,
    ): DatabaseQueryBuilderContract<Record, { [AliasKey in keyof Columns]: AggregatesRegistry['Count'] }>

    /**
     * Accepting an un typed column with the alias for the count.
     */
    <Alias extends string>(
      column: OneOrMany<ValueWithSubQueries<string>>,
      alias: Alias,
    ): DatabaseQueryBuilderContract<Record, Dictionary<AggregatesRegistry['Count'], Alias>>

    /**
     * Accepting an object for multiple counts in a single query. Again
     * aliases are enforced for consistency
     */
    <
      Alias extends string,
      Columns extends Dictionary<OneOrMany<ValueWithSubQueries<string>>, Alias>,
    >(
      columns: Columns,
    ): DatabaseQueryBuilderContract<Record, { [AliasKey in keyof Columns]: AggregatesRegistry['Count'] }>
  }

  /**
   * Possible signatures for orderBy method.
   */
  interface OrderBy<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * Order by a named column and optional direction
     */
    <K extends keyof Record> (column: K, direction?: 'asc' | 'desc'): Builder

    /**
     * Order by multiple named columns with default direction
     */
    <K extends keyof Record> (columns: K[]): Builder

    /**
     * Order by multiple named columns and custom direction for each of them
     */
    <K extends keyof Record> (columns: { column: K, order?: 'asc' | 'desc' }[]): Builder

    /**
     * Order by an untyped column and optional direction
     */
    (column: string, direction?: 'asc' | 'desc'): Builder

    /**
     * Order by multiple untyped columns with default direction
     */
    (columns: string[]): Builder

    /**
     * Order by untyped multiple columns and custom direction for each of them
     */
    (columns: { column: string, order?: 'asc' | 'desc' }[]): Builder
  }

  /**
   * Possible signatures for a union clause
   */
  interface Union<Builder extends ChainableContract> {
    /**
     * A single callback with optional wrap
     */
    (callback: QueryCallback<Builder>, wrap?: boolean): Builder

    /**
     * An array of multiple callbacks
     */
    (callbacks: QueryCallback<Builder>[], wrap?: boolean): Builder

    /**
     * A single subquery or a raw query
     */
    (subquery: ChainableContract<any> | RawContract, wrap?: boolean): Builder

    /**
     * An array of subqueries or raw queries
     */
    (subqueries: (ChainableContract<any> | RawContract)[], wrap?: boolean): Builder
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
  interface Having<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * A subquery callback
     */
    (callback: QueryCallback<Builder>): Builder

    /**
     * A typed key, comparison operator along with a literal value, a raw
     * query or a subquery.
     */
    <K extends keyof Record> (
      key: K,
      operator: string,
      value: ValueWithSubQueries<Record[K]>,
    ): Builder

    /**
     * An untyped key, comparison operator along with a literal value, a raw
     * query or a subquery.
     *
     * We support untyped keys, since having clause can reference an alias field
     * as well.
     */
    (
      key: string,
      operator: string,
      value: StrictValues | ChainableContract<any>,
    ): Builder
  }

  /**
   * Possible signatures for `having in` clause.
   */
  interface HavingIn<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * A typed key, along with an array of literal values, a raw queries or
     * subqueries.
     */
    <K extends keyof Record> (key: K, value: ValueWithSubQueries<Record[K]>[]): Builder

    /**
     * An untyped key, along with an array of literal values, a raw queries or
     * subqueries.
     */
    <K extends keyof Record> (key: string, value: StrictValues[]): Builder

    /**
     * A typed key, along with a query callback
     */
    <K extends keyof Record> (key: K, callback: QueryCallback<Builder>): Builder
  }

  /**
   * Possible signatures for `having null` clause
   */
  interface HavingNull<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > extends WhereNull<Builder, Record> {
  }

  /**
   * Possible signatures for `having exists` clause
   */
  interface HavingExists<Builder extends ChainableContract> {
    /**
     * A query callback or a sub query
     */
    (callback: QueryCallback<Builder> | ChainableContract<any>): Builder
  }

  /**
   * Possible signatures for having between
   */
  interface HavingBetween<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>,
  > {
    /**
     * A typed key, along with a tuple of literal values, raw queries or
     * sub queries.
     */
    <K extends keyof Record> (key: K, value: [
      ValueWithSubQueries<Record[K]>,
      ValueWithSubQueries<Record[K]>,
    ]): Builder

    /**
     * An utyped key, along with a tuple of literal values, raw queries or
     * sub queries.
     */
    (key: string, value: [
      StrictValues | ChainableContract<any>,
      StrictValues | ChainableContract<any>,
    ]): Builder
  }

  /**
   * Possible signatures of `with` CTE
   */
  interface With<Builder extends ChainableContract> {
    (alias: string, query: RawContract | ChainableContract<any>): Builder
  }

  /**
   * Possible signatures for defining table
   */
  interface Table<Builder> {
    (table: string): Builder
    (table: Dictionary<string, string>): Builder
  }

  /**
   * Possible signatures for defining table for a select query. A query
   * callback is allowed for select queries for computing a value
   * from a subquery
   */
  interface SelectTable<Builder extends ChainableContract> extends Table<Builder> {
    (callback: QueryCallback<Builder>): Builder
  }

  /**
   * Possible signatures for the `returning` method.
   */
  interface Returning<
    Builder,
    Record extends Dictionary<any, string>
  > {
    /**
     * Mark return columns as a single array of value type for the given
     * key
     */
    <K extends keyof Record> (column: K): Builder

    /**
     * Mark return columns as an array of key/value pair with correct types.
     */
    <K extends keyof Record> (columns: K[]): Builder
  }

  /**
   * Possible signatures for performing an update
   */
  interface Update<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>
  > {
    /**
     * Accepts an array of object of named key/value pair and returns an array
     * of Generic return columns.
     */
    <K extends keyof Record> (values: { [P in K]: Record[P] }): Builder

    /**
     * Accepts a key/value pair to update.
     */
    <K extends keyof Record> (column: K, value: Record[K]): Builder
  }

  /**
   * Possible signatures for incrementing/decrementing
   * values
   */
  interface Counter<
    Builder extends ChainableContract,
    Record extends Dictionary<any, string>
  > {
    <K extends keyof Record> (column: K, counter?: number): Builder
    <K extends keyof Record> (values: { [P in K]: number }): Builder
  }

  /**
   * A executable query builder will always have these methods on it.
   */
  interface ExcutableQueryBuilderContract<Result> extends Promise<Result> {
    debug (debug: boolean): this
    timeout (time: number, options?: { cancel: boolean }): this
    useTransaction (trx: TransactionClientContract): this
    toQuery (): string
    exec (): Promise<Result>
    toSQL (): knex.Sql
  }

  /**
   * Possible signatures for an insert query
   */
  interface Insert<
    Builder extends InsertQueryBuilderContract,
    Record extends Dictionary<any, string>
  > {
    <K extends keyof Record> (values: { [P in K]: Record[P] }): Builder
  }

  /**
   * Possible signatures for doing multiple inserts in a single query
   */
  interface MultiInsert<
    Builder extends InsertQueryBuilderContract,
    Record extends Dictionary<any, string>
  > {
    <K extends keyof Record> (values: { [P in K]: Record[P] }[]): Builder
  }

  /**
   * The chainable contract has all the methods that can be chained
   * to build a query. This interface will never have any
   * methods to execute a query.
   */
  export interface ChainableContract <
    Record extends Dictionary<any, string> = Dictionary<StrictValues, string>,
  > {
    from: SelectTable<this>

    where: Where<this, Record>
    orWhere: Where<this, Record>
    andWhere: Where<this, Record>

    whereNot: Where<this, Record>
    orWhereNot: Where<this, Record>
    andWhereNot: Where<this, Record>

    whereIn: WhereIn<this, Record>
    orWhereIn: WhereIn<this, Record>
    andWhereIn: WhereIn<this, Record>

    whereNotIn: WhereIn<this, Record>
    orWhereNotIn: WhereIn<this, Record>
    andWhereNotIn: WhereIn<this, Record>

    whereNull: WhereNull<this, Record>
    orWhereNull: WhereNull<this, Record>
    andWhereNull: WhereNull<this, Record>

    whereNotNull: WhereNull<this, Record>
    orWhereNotNull: WhereNull<this, Record>
    andWhereNotNull: WhereNull<this, Record>

    whereExists: WhereExists<this>
    orWhereExists: WhereExists<this>
    andWhereExists: WhereExists<this>

    whereNotExists: WhereExists<this>
    orWhereNotExists: WhereExists<this>
    andWhereNotExists: WhereExists<this>

    whereBetween: WhereBetween<this, Record>
    orWhereBetween: WhereBetween<this, Record>
    andWhereBetween: WhereBetween<this, Record>

    whereNotBetween: WhereBetween<this, Record>
    orWhereNotBetween: WhereBetween<this, Record>
    andWhereNotBetween: WhereBetween<this, Record>

    whereRaw: RawQueryBuilderContract<this>
    orWhereRaw: RawQueryBuilderContract<this>
    andWhereRaw: RawQueryBuilderContract<this>

    join: Join<this>
    innerJoin: Join<this>
    leftJoin: Join<this>
    leftOuterJoin: Join<this>
    rightJoin: Join<this>
    rightOuterJoin: Join<this>
    fullOuterJoin: Join<this>
    crossJoin: Join<this>
    joinRaw: RawQueryBuilderContract<this>

    having: Having<this, Record>
    orHaving: Having<this, Record>
    andHaving: Having<this, Record>

    havingIn: HavingIn<this, Record>
    orHavingIn: HavingIn<this, Record>
    andHavingIn: HavingIn<this, Record>

    havingNotIn: HavingIn<this, Record>
    orHavingNotIn: HavingIn<this, Record>
    andHavingNotIn: HavingIn<this, Record>

    havingNull: HavingNull<this, Record>
    orHavingNull: HavingNull<this, Record>
    andHavingNull: HavingNull<this, Record>

    havingNotNull: HavingNull<this, Record>
    orHavingNotNull: HavingNull<this, Record>
    andHavingNotNull: HavingNull<this, Record>

    havingExists: HavingExists<this>
    orHavingExists: HavingExists<this>
    andHavingExists: HavingExists<this>

    havingNotExists: HavingExists<this>
    orHavingNotExists: HavingExists<this>
    andHavingNotExists: HavingExists<this>

    havingBetween: HavingBetween<this, Record>
    orHavingBetween: HavingBetween<this, Record>
    andHavingBetween: HavingBetween<this, Record>

    havingNotBetween: HavingBetween<this, Record>
    orHavingNotBetween: HavingBetween<this, Record>
    andHavingNotBetween: HavingBetween<this, Record>

    havingRaw: RawQueryBuilderContract<this>
    orHavingRaw: RawQueryBuilderContract<this>
    andHavingRaw: RawQueryBuilderContract<this>

    distinct: Distinct<this, Record>

    groupBy: GroupBy<this, Record>
    groupByRaw: RawQueryBuilderContract<this>

    orderBy: OrderBy<this, Record>
    orderByRaw: RawQueryBuilderContract<this>

    union: Union<this>
    unionAll: UnionAll<this>

    intersect: Intersect<this>

    with: With<this>,
    withRecursive: With<this>,

    withSchema (schema: string): this,
    as (name: string): this

    offset (offset: number): this
    limit (limit: number): this

    clearSelect (): this
    clearWhere (): this
    clearOrder (): this
    clearHaving (): this

    forUpdate (...tableNames: string[]): this
    forShare (...tableNames: string[]): this

    skipLocked (): this
    noWait (): this
  }

  /**
   * Database query builder interface. Some of the methods on the Database
   * query builder and Model query builder will behave differently.
   */
  export interface DatabaseQueryBuilderContract <
    Record extends Dictionary<any, string> = Dictionary<any, string>,
    Result extends any = Record,
  > extends ChainableContract<Record>, ExcutableQueryBuilderContract<Result[]> {
    select: DatabaseQueryBuilderSelect<this, Record>

    /**
     * Aggregates
     */
    count: Aggregate<Record, Result>
    countDistinct: Aggregate<Record, Result>
    min: Aggregate<Record, Result>
    max: Aggregate<Record, Result>
    sum: Aggregate<Record, Result>
    avg: Aggregate<Record, Result>
    avgDistinct: Aggregate<Record, Result>

    returning: Returning<this, Record>
    update: Update<this, Record>
    increment: Counter<this, Record>
    decrement: Counter<this, Record>
    del (): this

    /**
     * Clone current query
     */
    clone<
      ClonedRecord extends Dictionary<any, string> = Record,
      ClonedResult = Result,
    > (): DatabaseQueryBuilderContract<ClonedRecord, ClonedResult>

    /**
     * Execute and get first result
     */
    first (): Promise<Result | null>
  }

  /**
   * Insert query builder to perform database inserts
   */
  export interface InsertQueryBuilderContract<
    Record extends Dictionary<any, string> = Dictionary<StrictValues, string>,
    ReturnColumns extends any[] = any[]
  > extends ExcutableQueryBuilderContract<ReturnColumns> {
    /**
     * Table for the insert query
     */
    table: Table<this>

    /**
     * Define returning columns
     */
    returning: Returning<this, Record>

    /**
     * Inserting a single record.
     */
    insert: Insert<this, Record>

    /**
     * Inserting multiple columns at once
     */
    multiInsert: MultiInsert<this, Record>
  }

  /**
   * Shape of raw query instance
   */
  interface RawContract extends ExcutableQueryBuilderContract<any> {
    wrap (before: string, after: string): this
  }

  /**
   * Shape of the query client, that is used to retrive instances
   * of query builder
   */
  interface QueryClientContract {
    /**
     * Custom profiler to time queries
     */
    profiler?: ProfilerRowContract | ProfilerContract

    /**
     * Tells if client is a transaction client or not
     */
    isTransaction: boolean

    /**
     * The database dialect in use
     */
    dialect: string

    /**
     * The client mode in which it is execute queries
     */
    mode: 'dual' | 'write' | 'read'

    /**
     * The name of the connnection from which the client
     * was originated
     */
    connectionName: string

    /**
     * Returns the read and write clients
     */
    getReadClient (): knex | knex.Transaction
    getWriteClient (): knex | knex.Transaction

    /**
     * Get new query builder instance for select, update and
     * delete calls
     */
    query (): DatabaseQueryBuilderContract,

    /**
     * Get new query builder instance inserts
     */
    insertQuery (): InsertQueryBuilderContract,

    /**
     * Get raw query builder instance
     */
    raw: RawBuilderContract,

    /**
     * Truncate a given table
     */
    truncate (table: string): Promise<void>,

    /**
     * Returns columns info for a given table
     */
    columnsInfo (table: string): Promise<{ [column: string]: knex.ColumnInfo }>,
    columnsInfo (table: string, column: string): Promise<knex.ColumnInfo>,

    /**
     * Same as `query()`, but also selects the table for the query
     */
    from: DatabaseQueryBuilderContract['from'],

    /**
     * Same as `insertQuery()`, but also selects the table for the query
     */
    table: InsertQueryBuilderContract['table'],

    /**
     * Get instance of transaction client
     */
    transaction (): Promise<TransactionClientContract>,
  }

  /**
   * The shape of transaction client to run queries under a given
   * transaction on a single connection
   */
  interface TransactionClientContract extends QueryClientContract {
    knexClient: knex.Transaction,

    /**
     * Is transaction completed or not
     */
    isCompleted: boolean,

    /**
     * Commit transaction
     */
    commit (): Promise<void>,

    /**
     * Rollback transaction
     */
    rollback (): Promise<void>
  }
}

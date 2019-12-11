/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Lucid/DatabaseQueryBuilder' {
  import * as knex from 'knex'
  import { Dictionary } from 'ts-essentials'
  import { ProfilerRowContract, ProfilerContract } from '@ioc:Adonis/Core/Profiler'
  import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'

  /**
   * Get one or many of a generic
   */
  type OneOrMany<T> = T | T[]

  /**
   * Allowing a generic value along with raw query instance or a subquery
   * instance
   */
  type ValueWithSubQueries<T extends any> = T | ChainableContract | RawContract

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
    | RawContract

  export type StrictValuesWithoutRaw = Exclude<StrictValues, RawContract>

  /**
   * A builder method to allow raw queries. However, the return type is the
   * instance of current query builder. This is used for `.{verb}Raw` methods.
   */
  interface RawQueryFn<Builder extends ChainableContract> {
    (sql: string | RawContract): Builder
    (sql: string, bindings: { [key: string]: StrictValuesWithoutRaw }): Builder
    (sql: string, bindings: StrictValuesWithoutRaw[]): Builder
  }

  /**
   * Query callback is used to write wrapped queries. We get rid of `this` from
   * knex, since it makes everything confusing.
   */
  type QueryCallback<Builder extends ChainableContract> = (
    (builder: Builder) => void
  )

  /**
   * Function to transform the query callbacks and passing them the right
   * instance
   */
  type DBQueryCallback = (userFn: QueryCallback<ChainableContract>) => ((builder: knex.QueryBuilder) => void)

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
  interface DatabaseQueryBuilderSelect<Builder extends ChainableContract> {
    /**
     * Selecting columns as a dictionary with key as the alias and value is
     * the original column. When aliases are defined, the return output
     * will have the alias columns and not the original one's
     */
    (columns: Dictionary<string, string>): Builder

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
  interface Where<Builder extends ChainableContract> {
    /**
     * Callback for wrapped clauses
     */
    (callback: QueryCallback<Builder>): Builder

    /**
     * Passing an object of named key/value pair
     */
    (clause: Dictionary<any, string>): Builder

    /**
     * Accepting any string as a key for supporting `dot` aliases
     */
    (key: string, value: StrictValues | ChainableContract): Builder
    (key: string, operator: string, value: StrictValues | ChainableContract): Builder
  }

  /**
   * Possible signatures for adding where in clause.
   */
  interface WhereIn<Builder extends ChainableContract> {
    /**
     * Allowing any string key (mainly for prefixed columns) with all
     * possible values
     */
    (K: string, value: (StrictValues | ChainableContract)[]): Builder
    (K: string[], value: (StrictValues | ChainableContract)[][]): Builder

    (k: string, subquery: ChainableContract | QueryCallback<Builder>): Builder
    (k: string[], subquery: ChainableContract): Builder
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
    (callback: QueryCallback<Builder> | ChainableContract): Builder
  }

  /**
   * Possibles signatures for adding a where between clause
   */
  interface WhereBetween<Builder extends ChainableContract> {
    /**
     * Accept any string as a key for supporting prefix columns
     */
    (key: string, value: [
      StrictValues | ChainableContract,
      StrictValues | ChainableContract,
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
  interface Distinct<Builder extends ChainableContract> {
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
  interface GroupBy<Builder extends ChainableContract> extends Distinct<Builder> {
  }

  /**
   * Possible signatures for aggregate functions. Aggregates will push to the
   * result set. Unlike knex, we force defining aliases for each aggregate.
   */
  interface Aggregate <Builder extends ChainableContract> {
    /**
     * Accepting an un typed column with the alias for the count.
     */
    (
      column: OneOrMany<ValueWithSubQueries<string>>,
      alias?: string,
    ): Builder

    /**
     * Accepting an object for multiple counts in a single query.
     */
    (
      columns: Dictionary<OneOrMany<ValueWithSubQueries<string>>, string>,
    ): Builder
  }

  /**
   * Possible signatures for orderBy method.
   */
  interface OrderBy<Builder extends ChainableContract> {
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
    (subquery: ChainableContract | RawContract, wrap?: boolean): Builder

    /**
     * An array of subqueries or raw queries
     */
    (subqueries: (ChainableContract | RawContract)[], wrap?: boolean): Builder
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
    (callback: QueryCallback<Builder>): Builder

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
      value: StrictValues | ChainableContract,
    ): Builder
  }

  /**
   * Possible signatures for `having in` clause.
   */
  interface HavingIn<Builder extends ChainableContract> {
    /**
     * An untyped key, along with an array of literal values, a raw queries or
     * subqueries.
     */
    (key: string, value: (StrictValues | ChainableContract)[]): Builder

    /**
     * Untyped key, along with a query callback
     */
    (key: string, callback: QueryCallback<Builder>): Builder
  }

  /**
   * Possible signatures for `having null` clause
   */
  interface HavingNull<Builder extends ChainableContract> extends WhereNull<Builder> {
  }

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
  interface HavingBetween<Builder extends ChainableContract> extends WhereBetween<Builder> {
  }

  /**
   * Possible signatures of `with` CTE
   */
  interface With<Builder extends ChainableContract> {
    (alias: string, query: RawContract | ChainableContract | QueryCallback<Builder>): Builder
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
  interface Returning<Builder> {
    /**
     * Mark return columns as a single array of value type for the given
     * key
     */
    (column: string): Builder

    /**
     * Mark return columns as an array of key/value pair with correct types.
     */
    (columns: string[]): Builder
  }

  /**
   * Possible signatures for performing an update
   */
  interface Update<Builder extends ChainableContract> {
    /**
     * Accepts an array of object of named key/value pair and returns an array
     * of Generic return columns.
     */
    (values: Dictionary<any, string>): Builder

    /**
     * Accepts a key/value pair to update.
     */
    (column: string, value: any): Builder
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
    from: SelectTable<this>
    select: DatabaseQueryBuilderSelect<this>

    where: Where<this>
    orWhere: Where<this>
    andWhere: Where<this>

    whereNot: Where<this>
    orWhereNot: Where<this>
    andWhereNot: Where<this>

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

    groupBy: GroupBy<this>
    groupByRaw: RawQueryFn<this>

    orderBy: OrderBy<this>
    orderByRaw: RawQueryFn<this>

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
  }

  /**
   * Shape of the raw query that can also be passed as a value to
   * other queries
   */
  interface RawContract {
    client: QueryClientContract,
    toKnex (): knex.Raw,
    wrap (before: string, after: string): this
  }

  /**
   * Database query builder interface. It will use the `Executable` trait
   * and hence must be typed properly for that.
  */
  export interface DatabaseQueryBuilderContract <
    Result extends any = Dictionary<any, string>,
  > extends ChainableContract {
    client: QueryClientContract,

    /**
     * Clone current query
     */
    clone<ClonedResult = Result> (): DatabaseQueryBuilderContract<ClonedResult>

    /**
     * Execute and get first result
     */
    first (): Promise<Result | null>

    del (): this

    /**
     * Mutations (update and increment can be one query aswell)
     */
    update: Update<this>
    increment: Counter<this>
    decrement: Counter<this>
  }

  /**
   * Insert query builder to perform database inserts.
   */
  export interface InsertQueryBuilderContract {
    client: QueryClientContract,

    /**
     * Table for the insert query
     */
    table: Table<this>

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
}

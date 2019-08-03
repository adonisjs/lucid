/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

declare module '@ioc:Adonis/Addons/DatabaseQueryBuilder' {
  import { Dictionary } from 'ts-essentials'
  import { JoinCallback, Sql } from 'knex'

  /**
   * A known set of values allowed when defining different
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
   * Output of raw query builder
   */
  interface RawContract {
    wrap (before: string, after: string): this
    toQuery (): string
    toSQL (): Sql
  }

  /**
   * Shape of raw query builder
   */
  interface RawBuilderContract {
    (value: string): RawContract
    (sql: string, ...bindings: StrictValues[]): RawContract
    (sql: string, bindings: StrictValues[]): RawContract
  }

  /**
   * Shape of raw query builder. The different is, it will return
   * the existing query builder chain instead of `RawContract`
   */
  interface RawQueryBuilderContract<Builder extends ChainableContract> {
    (value: string): Builder
    (sql: string, ...bindings: StrictValues[]): Builder
    (sql: string, bindings: StrictValues[]): Builder
  }

  /**
   * Where callback function to write wrapped where
   * statements
   */
  type WhereCallback<Builder extends ChainableContract> = (
    (this: Builder, builder: Builder) => void
  )

  /**
   * Possible signatures for a select method on database query builder.
   * The models query builder may have a different signature all
   * together.
   */
  interface DatabaseQueryBuilderSelect<Record, Result extends any = Record> {
    /**
     * Selecting named columns as array
     */
    <K extends keyof Record> (columns: K[]): DatabaseQueryBuilderContract<Record, { [P in K]: Result[P] }>

    /**
     * Selecting named columns as spread
     */
    <K extends keyof Record> (...columns: K[]): DatabaseQueryBuilderContract<Record, { [P in K]: Result[P] }>

    /**
     * Selecting columns as a dictionary with key as the alias and value is
     * the original column
     */
    <K extends keyof Record, Alias extends string, Columns extends Dictionary<K, Alias>> (
      columns: Columns,
    ): DatabaseQueryBuilderContract<Record, { [AliasKey in keyof Columns]: Record[Columns[AliasKey]] }>

    /**
     * Selecting columns as array
     */
    (columns: (string | ChainableContract<any> | RawContract)[]): DatabaseQueryBuilderContract<Record, any>

    /**
     * Selecting columns as spread
     */
    (...columns: (string | ChainableContract<any> | RawContract)[]): DatabaseQueryBuilderContract<Record, any>

    /**
     * Wildcard selector
     */
    (column: '*'): DatabaseQueryBuilderContract<Record, Result>
  }

  /**
   * Possible signatures for adding a where clause
   */
  interface Where<Builder extends ChainableContract, Record> {
    /**
     * Passing an object of named key/value pair
     */
    (clause: Partial<Record>): Builder

    /**
     * Callback for wrapped clauses
     */
    (callback: WhereCallback<Builder>): Builder

    /**
     * Key/value pair with the same value type, a subquery or
     * a raw query
     */
    <K extends keyof Record> (
      key: K,
      value: Record[K] | ChainableContract<any> | RawContract,
    ): Builder

    /**
     * key/value with operator
     */
    <K extends keyof Record> (
      key: K,
      operator: string,
      value: Record[K] | ChainableContract<any> | RawContract,
    ): Builder
  }

  /**
   * Possible signatures for adding where In clause.
   * @todo: Implement 2d array support
   */
  interface WhereIn<Builder extends ChainableContract, Record> {
    /**
     * Key/value pair with key being a named literal value and array
     * of same types, a subquery or a raw query
     */
    <K extends keyof Record> (
      key: K,
      value: (Record[K] | ChainableContract<any> | RawContract)[],
    ): Builder

    /**
     * Key/value pair with key being a named literal value
     * and value is a callback
     */
    <K extends keyof Record> (key: K, callback: WhereCallback<Builder>): Builder
  }

  /**
   * Possible signatures for adding whereNull clause.
   */
  interface WhereNull<Builder extends ChainableContract, Record> {
    <K extends keyof Record> (key: K): Builder
  }

  /**
   * Possibles signatures for adding a where exists clause
   */
  interface WhereExists<Builder extends ChainableContract> {
    (callback: WhereCallback<Builder> | ChainableContract<any>): Builder
  }

  /**
   * Possibles signatures for adding a where between clause
   */
  interface WhereBetween<Builder extends ChainableContract, Record> {
    /**
     * Allowing a named key with values of similar data type or a raw
     * query/subquery
     */
    <K extends keyof Record> (key: K, value: [
      Record[K] | RawContract | ChainableContract<any>,
      Record[K] | RawContract | ChainableContract<any>,
    ]): Builder
  }

  /**
   * Possibles signatures for a raw where clause.
   */
  interface WhereRaw<Builder extends ChainableContract, Record> {
    /**
     * Passing a raw sql with an array of values
     */
    (sql: string, bindings: (StrictValues | ChainableContract<any>)[]): Builder

    /**
     * Passing a raw sql with a key/value pair of values. Where key
     * is the subsitutes in the sql query.
     */
    (sql: string, bindings: { [key: string]: (StrictValues | ChainableContract<any>) }): Builder

    /**
     * Output of raw query
     */
    (raw: RawContract): Builder
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
    (table: string, primaryColumn: string, raw: RawBuilderContract): Builder

    /**
     * Defining the join table with primary and secondary columns
     * to match with a custom operator
     */
    (table: string, primaryColumn: string, operator: string, secondaryColumn: string): Builder

    /**
     * Defining the join table with primary and secondary columns
     * to match with a custom operator, where secondary column is
     * output of a raw query
     */
    (table: string, primaryColumn: string, operator: string, raw: RawBuilderContract): Builder

    /**
     * Join with a callback
     */
    (table: string, callback: JoinCallback): Builder
  }

  /**
   * Possible signatures for a raw join
   */
  interface JoinRaw<Builder extends ChainableContract> {
    (tableName: string, binding?: StrictValues): Builder
  }

  /**
   * Possible signatures for a distinct clause
   */
  interface Distinct<Builder extends ChainableContract, Record> {
    /**
     * Named keys
     */
    <K extends keyof Record> (columns: K[]): Builder

    /**
     * Named keys as spread
     */
    <K extends keyof Record> (...columns: K[]): Builder

    /**
     * An array of strings
     */
    (columns: string[]): Builder

    /**
     * Spread of strings
     */
    (...columns: string[]): Builder

    /**
     * Wildcard selector
     */
    (column: '*'): Builder
  }

  /**
   * The signatures are same as distinct method. For subqueries and
   * raw queries, one must use `groupByRaw`.
   */
  interface GroupBy<Builder extends ChainableContract, Record> extends Distinct<Builder, Record> {
  }

  /**
   * GroupByRaw is same as RawQueryBuilderContract
   */
  interface GroupByRaw<Builder extends ChainableContract> extends RawQueryBuilderContract<Builder> {
  }

  /**
   * Possible signatures for orderBy method.
   */
  interface OrderBy<Builder extends ChainableContract, Record> {
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
    <K extends keyof Record> (columns: { column: K, direction?: 'asc' | 'desc' }[]): Builder

    /**
     * Order by a column and optional direction
     */
    (column: string, direction?: 'asc' | 'desc'): Builder

    /**
     * Order by multiple columns with default direction
     */
    (columns: string[]): Builder

    /**
     * Order by multiple columns and custom direction for each of them
     */
    (columns: { column: string, direction?: 'asc' | 'desc' }[]): Builder
  }

  /**
   * OrderByRaw is same as RawQueryBuilderContract
   */
  interface OrderByRaw<Builder extends ChainableContract> extends RawQueryBuilderContract<Builder> {
  }

  /**
   * Possible signatures for a union clause
   */
  interface Union<Builder extends ChainableContract> {
    /**
     * A single callback with optional wrap
     */
    (callback: WhereCallback<Builder>, wrap?: boolean): Builder

    /**
     * An array of multiple callbacks
     */
    (callbacks: WhereCallback<Builder>[], wrap?: boolean): Builder

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
   * Possible signatures for the `returning` method when called on
   * the insert query builder.
   */
  interface InsertReturning<Record> {
    /**
     * Mark return columns as a single array of value type for the given
     * key
     */
    <K extends keyof Record> (
      column: K,
    ): InsertQueryBuilderContract<Record, [Record[K]] | [number]>

    /**
     * Mark return columns as an array of key/value pair with correct types.
     */
    <K extends keyof Record> (
      columns: K[],
    ): InsertQueryBuilderContract<Record, ([{ [P in K]: Record[P] }] | [number])>
  }

  /**
   * Possible signatures for an insert query
   */
  interface Insert<Record, ReturnColumns> {
    /**
     * Accepts an object of named key/value pair and returns an array
     * of Generic return columns.
     */
    <K extends keyof Record> (columns: { [P in K]: Record[P] }): Promise<ReturnColumns>
  }

  /**
   * Possible signatures for doing Bulk insert
   */
  interface BatchInsert<Record, ReturnColumns> {
    /**
     * Accepts an array of object of named key/value pair and returns an array
     * of Generic return columns.
     */
    <K extends keyof Record> (values: { [P in K]: Record[P] }[]): Promise<ReturnColumns>
  }

  /**
   * Possible signatures for performing an update
   */
  interface Update<Record, ReturnColumns> {
    /**
     * Accepts an array of object of named key/value pair and returns an array
     * of Generic return columns.
     */
    <K extends keyof Record> (values: { [P in K]: Record[P] }): Promise<ReturnColumns>

    /**
     * Accepts a key/value pair to update.
     */
    <K extends keyof Record> (column: K, value: Record[K]): Promise<ReturnColumns>
  }

  /**
   * The chainable contract has all the methods that can be chained
   * to build a query. This interface will never have any
   * methods to execute a query.
   */
  export interface ChainableContract <
    Record extends Dictionary<any, string> = Dictionary<any, string>,
  > {
    from (table: string): this
    from (table: Dictionary<string, string>): this

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

    whereRaw: WhereRaw<this, Record>
    orWhereRaw: WhereRaw<this, Record>
    andWhereRaw: WhereRaw<this, Record>

    join: Join<this>
    innerJoin: Join<this>
    leftJoin: Join<this>
    leftOuterJoin: Join<this>
    rightJoin: Join<this>
    rightOuterJoin: Join<this>
    fullOuterJoin: Join<this>
    crossJoin: Join<this>
    joinRaw: JoinRaw<this>

    distinct: Distinct<this, Record>

    groupBy: GroupBy<this, Record>
    groupByRaw: GroupByRaw<this>

    orderBy: OrderBy<this, Record>
    orderByRaw: OrderByRaw<this>

    offset (offset: number): this
    limit (limit: number): this

    union: Union<this>
    unionAll: UnionAll<this>

    intersect: Intersect<this>
  }

  /**
   * Insert query builder can be obtained by specifying return columns
   * using `returning` method
   */
  export interface InsertQueryBuilderContract <
    Record extends Dictionary<any, string> = Dictionary<any, string>,
    ReturnColumns extends any[] = number[]
  > {
    /**
     * Define returning columns
     */
    returning: InsertReturning<Record>

    /**
     * Inserting a single record.
     */
    insert: Insert<Record, ReturnColumns>

    /**
     * In single insert, we always know that one item inside an array is returned, so
     * instead of using `val[]`, we make use of `[val]`. However, in `batchInsert`,
     * we need the `val[]`. So that's why, we pick the insert item of the
     * `ReturnColumns` and return an array of it. COMPLEX 🤷
     */
    batchInsert: BatchInsert<Record, ReturnColumns[0][]>
  }

  /**
   * Database query builder interface. Some of the methods on the Database
   * query builder and Model query builder will behave differently.
   */
  export interface DatabaseQueryBuilderContract <
    Record extends Dictionary<any, string> = Dictionary<any, string>,
    Result extends any = Record,
  > extends ChainableContract<Record> {
    select: DatabaseQueryBuilderSelect<Record, Result>,

    /**
     * Returns the first row
     */
    first (): Result
  }
}

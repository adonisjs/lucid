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
  import { JoinCallback, Sql, Raw } from 'knex'

  export interface Registery {
    Count: number,
  }

  type OneOrMany<T extends any> = T | T[]

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
   * Allowing a generic value along with raw query instance or a subquery
   * instance
   */
  type ValueWithSubQueries<T extends any> = T | ChainableContract<any> | RawContract

  /**
   * Shape of raw query instance
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
    (sql: string): RawContract
    (sql: string, bindings: { [key: string]: Exclude<StrictValues, RawContract> }): RawContract
    (sql: string, bindings: Exclude<StrictValues, RawContract>[]): RawContract
  }

  /**
   * Shape of raw query builder. The different is, it will return
   * the existing query builder chain instead of `RawContract`
   */
  interface RawQueryBuilderContract<Builder extends ChainableContract> {
    (sql: string): Builder
    (sql: string, bindings: { [key: string]: Exclude<StrictValues, RawContract> }): Builder
    (sql: string, bindings: Exclude<StrictValues, RawContract>[]): Builder
    (sql: RawContract): Builder
  }

  /**
   * Query callback is used to write wrapped queries.
   */
  type QueryCallback<Builder extends ChainableContract> = (
    (builder: Builder) => void
  )

  /**
   * Possible signatures for a select method on database query builder.
   * The models query builder may have a different signature all
   * together.
   */
  interface DatabaseQueryBuilderSelect<
    Record extends Dictionary<StrictValues, string>,
    Result extends any = Record
  > {
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
     * the original column. When aliases are defined, the return output
     * will have the alias columns and not the original one's
     */
    <K extends keyof Record, Alias extends string, Columns extends Dictionary<K, Alias>> (
      columns: Columns,
    ): DatabaseQueryBuilderContract<Record, { [AliasKey in keyof Columns]: Record[Columns[AliasKey]] }>

    /**
     * String fallback when columns to be selected aren't derived from
     * record. Here we allow subqueries, raw queries or an array
     * of strings.
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
  interface Where<
    Builder extends ChainableContract,
    Record extends Dictionary<StrictValues, string>,
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
  }

  /**
   * Possible signatures for adding where in clause.
   */
  interface WhereIn<
    Builder extends ChainableContract,
    Record extends Dictionary<StrictValues, string>,
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
    <K extends keyof Record> (key: K, subquery: ChainableContract<any>): Builder

    /**
     * A named column as the key along with a query callback. The query callback
     * must yield an array of values to be valid at runtime.
     */
    <K extends keyof Record> (key: K, callback: QueryCallback<Builder>): Builder

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
  }

  /**
   * Possible signatures for adding whereNull clause.
   */
  interface WhereNull<
    Builder extends ChainableContract,
    Record extends Dictionary<StrictValues, string>,
  > {
    <K extends keyof Record> (key: K): Builder
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
    Record extends Dictionary<StrictValues, string>,
  > {
    /**
     * Typed column with an tuple of a literal value, a raw query or
     * a sub query
     */
    <K extends keyof Record> (key: K, value: [
      ValueWithSubQueries<Record[K]>,
      ValueWithSubQueries<Record[K]>,
    ]): Builder
  }

  /**
   * Possibles signatures for a raw where clause.
   */
  interface WhereRaw<Builder extends ChainableContract> extends RawQueryBuilderContract<Builder> {
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
    (table: string, callback: JoinCallback): Builder
  }

  /**
   * Possible signatures for a raw join
   */
  interface JoinRaw<Builder extends ChainableContract> extends RawQueryBuilderContract<Builder> {
  }

  /**
   * Possible signatures for a distinct clause
   */
  interface Distinct<
    Builder extends ChainableContract,
    Record extends Dictionary<StrictValues, string>,
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
    Record extends Dictionary<StrictValues, string>,
  > extends Distinct<Builder, Record> {
  }

  /**
   * GroupByRaw is same as `RawQueryBuilderContract`
   */
  interface GroupByRaw<Builder extends ChainableContract> extends RawQueryBuilderContract<Builder> {
  }

  /**
   * Possible signatures for aggregate functions. It will append
   * to the pre existing result
   */
  interface Aggregate <
    Record extends Dictionary<StrictValues, string>,
    Result extends any = Record,
  > {
    /**
     * Accepting a typed column with the alias for the count. Unlike knex
     * we enforce the alias, otherwise the output highly varies based
     * upon the driver in use
     */
    <K extends keyof Record, Alias extends string>(
      column: OneOrMany<K>,
      alias: Alias,
    ): DatabaseQueryBuilderContract<Record, (Result & Dictionary<Registery['Count'], Alias>)>

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
    ): DatabaseQueryBuilderContract<Record, (Result & { [AliasKey in keyof Columns]: Registery['Count'] })>

    /**
     * Accepting an un typed column with the alias for the count.
     */
    <Alias extends string>(
      column: OneOrMany<ValueWithSubQueries<string>>,
      alias: Alias,
    ): DatabaseQueryBuilderContract<Record, (Result & Dictionary<Registery['Count'], Alias>)>

    /**
     * Accepting an object for multiple counts in a single query. Again
     * aliases are enforced for consistency
     */
    <
      Alias extends string,
      Columns extends Dictionary<OneOrMany<ValueWithSubQueries<string>>, Alias>,
    >(
      columns: Columns,
    ): DatabaseQueryBuilderContract<Record, (Result & { [AliasKey in keyof Columns]: Registery['Count'] })>
  }

  /**
   * Possible signatures for orderBy method.
   */
  interface OrderBy<
    Builder extends ChainableContract,
    Record extends Dictionary<StrictValues, string>,
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
    Record extends Dictionary<StrictValues, string>,
  > extends RawQueryBuilderContract<Builder> {
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
    Record extends Dictionary<StrictValues, string>,
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
    Record extends Dictionary<StrictValues, string>,
  > extends WhereNull<Builder, Record> {
    /**
     * Supporting untyped keys, since having clause can refer alias columns as well.
     */
    (key: string): Builder
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
    Record extends Dictionary<StrictValues, string>,
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
   * Possibles signatures for a raw where clause.
   */
  interface HavingRaw<Builder extends ChainableContract, Record> extends RawQueryBuilderContract<Builder> {
  }

  /**
   * Possible signatures for defining table
   */
  interface Table<Builder> {
    (table: string): Builder
    (table: Dictionary<string, string>): Builder
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
    Record extends Dictionary<StrictValues, string> = Dictionary<StrictValues, string>,
  > {
    from: Table<this>

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

    whereRaw: WhereRaw<this>
    orWhereRaw: WhereRaw<this>
    andWhereRaw: WhereRaw<this>

    join: Join<this>
    innerJoin: Join<this>
    leftJoin: Join<this>
    leftOuterJoin: Join<this>
    rightJoin: Join<this>
    rightOuterJoin: Join<this>
    fullOuterJoin: Join<this>
    crossJoin: Join<this>
    joinRaw: JoinRaw<this>

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

    havingRaw: HavingRaw<this, Record>
    orHavingRaw: HavingRaw<this, Record>
    andHavingRaw: HavingRaw<this, Record>

    distinct: Distinct<this, Record>

    groupBy: GroupBy<this, Record>
    groupByRaw: GroupByRaw<this>

    orderBy: OrderBy<this, Record>
    orderByRaw: OrderByRaw<this>

    union: Union<this>
    unionAll: UnionAll<this>

    intersect: Intersect<this>

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

    toSQL (): Sql
    toString (): string
  }

  /**
   * Database query builder interface. Some of the methods on the Database
   * query builder and Model query builder will behave differently.
   */
  export interface DatabaseQueryBuilderContract <
    Record extends Dictionary<StrictValues, string> = Dictionary<StrictValues, string>,
    Result extends any = Record,
  > extends ChainableContract<Record>, Promise<Result[]> {
    select: DatabaseQueryBuilderSelect<Record, Result>,

    count: Aggregate<Record, Result>,
    countDistinct: Aggregate<Record, Result>,
    min: Aggregate<Record, Result>,
    max: Aggregate<Record, Result>,
    sum: Aggregate<Record, Result>,
    avg: Aggregate<Record, Result>,
    avgDistinct: Aggregate<Record, Result>,

    /**
     * Returns the first row
     */
    first (): Result
  }

  /**
   * Possible signatures for the `returning` method when called on
   * the insert query builder.
   */
  interface InsertReturning<Record extends Dictionary<StrictValues, string>> {
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
  interface Insert<
    Record extends Dictionary<StrictValues, string>,
    ReturnColumns extends any[]
  > {
    /**
     * Defers the `insert` to `exec` method
     */
    <K extends keyof Record> (
      columns: { [P in K]: Record[P] },
      defer: true,
    ): InsertQueryBuilderContract<Record, ReturnColumns>

    /**
     * Performs the insert right away when defer is not defined or is set to false
     */
    <K extends keyof Record> (columns: { [P in K]: Record[P] }, defer?: boolean): Promise<ReturnColumns>
  }

  /**
   * Possible signatures for doing multiple inserts in a single query
   */
  interface MultiInsert<
    Record extends Dictionary<StrictValues, string>,
    ReturnColumns extends any[]
  > {
    /**
     * Defers the `insert` to `exec` method
     */
    <K extends keyof Record> (
      values: { [P in K]: Record[P] }[],
      defer: true,
    ): InsertQueryBuilderContract<Record, ReturnColumns>

    /**
     * Accepts an array of object of named key/value pair and returns an array
     * of Generic return columns.
     */
    <K extends keyof Record> (values: { [P in K]: Record[P] }[], defer?: boolean): Promise<ReturnColumns>
  }

  /**
   * Insert query builder can be obtained by specifying return columns
   * using `returning` method
   */
  export interface InsertQueryBuilderContract <
    Record extends Dictionary<StrictValues, string> = Dictionary<StrictValues, string>,
    ReturnColumns extends any[] = number[]
  > {
    table: Table<this>

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
     * instead of using `val[]`, we make use of `[val]`. However, in `multiInsert`,
     * we need the `val[]`. So that's why, we pick the insert item of the
     * `ReturnColumns` and return an array of it. COMPLEX 🤷
     */
    multiInsert: MultiInsert<Record, ReturnColumns[0][]>

    /**
     * Execute the insert
     */
    exec (): Promise<ReturnColumns>

    toSQL (): Sql
    toString (): string
  }
}

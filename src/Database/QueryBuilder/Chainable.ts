/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/// <reference path="../../../adonis-typings/index.ts" />

import knex from 'knex'
import { ChainableContract, QueryCallback } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

import { RawQueryBuilder } from './Raw'

/**
 * Function to transform the query callbacks and passing them the right
 * instance
 */
type DBQueryCallback = (userFn: QueryCallback<ChainableContract>) => ((builder: knex.QueryBuilder) => void)

/**
 * The chainable query builder to consturct SQL queries for selecting, updating and
 * deleting records.
 *
 * The API internally uses the knex query builder. However, many of methods may have
 * different API.
 */
export abstract class Chainable implements ChainableContract {
  constructor (
    public $knexBuilder: knex.QueryBuilder, // Needs to be public for Executable trait
    private _queryCallback: DBQueryCallback,
  ) {}

  /**
   * Returns the value pair for the `whereBetween` clause
   */
  private _getBetweenPair (value: any[]): any {
    const [lhs, rhs] = value
    if (!lhs || !rhs) {
      throw new Error('Invalid array for whereBetween value')
    }

    return [this.$transformValue(lhs), this.$transformValue(rhs)]
  }

  /**
   * Transforms the value to something that knex can internally understand and
   * handle. It includes.
   *
   * 1. Returning the `knexBuilder` for sub queries.
   * 2. Returning the `knexBuilder` for raw queries.
   * 3. Wrapping callbacks, so that the end user receives an instance Lucid query
   *    builder and not knex query builder.
   */
  protected $transformValue (value: any) {
    if (value instanceof Chainable) {
      return value.$knexBuilder
    }

    if (typeof (value) === 'function') {
      return this.$transformCallback(value)
    }

    return this.$transformRaw(value)
  }

  /**
   * Transforms the user callback to something that knex
   * can internally process
   */
  protected $transformCallback (value: any) {
    if (typeof (value) === 'function') {
      return this._queryCallback(value)
    }

    return value
  }

  /**
   * Returns the underlying knex raw query builder for Lucid raw
   * query builder
   */
  protected $transformRaw (value: any) {
    if (value instanceof RawQueryBuilder) {
      return value['$knexBuilder']
    }

    return value
  }

  /**
   * Define columns for selection
   */
  public select (): this {
    this.$knexBuilder.select(...arguments)
    return this
  }

  /**
   * Select table for the query. Re-calling this method multiple times will
   * use the last selected table
   */
  public from (table: any): this {
    this.$knexBuilder.from(this.$transformCallback(table))
    return this
  }

  /**
   * Add a `where` clause
   */
  public where (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.where(key, operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.where(key, this.$transformValue(operator))
    } else {
      /**
       * Only callback is allowed as a standalone param. One must use `whereRaw`
       * for raw/sub queries. This is our limitation to have consistent API
       */
      this.$knexBuilder.where(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Add a `or where` clause
   */
  public orWhere (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orWhere(key, operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orWhere(key, this.$transformValue(operator))
    } else {
      this.$knexBuilder.orWhere(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Alias for `where`
   */
  public andWhere (key: any, operator?: any, value?: any): this {
    return this.where(key, operator, value)
  }

  /**
   * Adding `where not` clause
   */
  public whereNot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.whereNot(key, operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.whereNot(key, this.$transformValue(operator))
    } else {
      this.$knexBuilder.whereNot(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Adding `or where not` clause
   */
  public orWhereNot (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orWhereNot(key, operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orWhereNot(key, this.$transformValue(operator))
    } else {
      this.$knexBuilder.orWhereNot(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Alias for [[whereNot]]
   */
  public andWhereNot (key: any, operator?: any, value?: any): this {
    return this.whereNot(key, operator, value)
  }

  /**
   * Adding a `where in` clause
   */
  public whereIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder.whereIn(key, value)
    return this
  }

  /**
   * Adding a `or where in` clause
   */
  public orWhereIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder.orWhereIn(key, value)
    return this
  }

  /**
   * Alias for [[whereIn]]
   */
  public andWhereIn (key: any, value: any): this {
    return this.whereIn(key, value)
  }

  /**
   * Adding a `where not in` clause
   */
  public whereNotIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder.whereNotIn(key, value)
    return this
  }

  /**
   * Adding a `or where not in` clause
   */
  public orWhereNotIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder.orWhereNotIn(key, value)
    return this
  }

  /**
   * Alias for [[whereNotIn]]
   */
  public andWhereNotIn (key: any, value: any): this {
    return this.whereNotIn(key, value)
  }

  /**
   * Adding `where not null` clause
   */
  public whereNull (key: any): this {
    this.$knexBuilder.whereNull(key)
    return this
  }

  /**
   * Adding `or where not null` clause
   */
  public orWhereNull (key: any): this {
    this.$knexBuilder.orWhereNull(key)
    return this
  }

  /**
   * Alias for [[whereNull]]
   */
  public andWhereNull (key: any): this {
    return this.whereNull(key)
  }

  /**
   * Adding `where not null` clause
   */
  public whereNotNull (key: any): this {
    this.$knexBuilder.whereNotNull(key)
    return this
  }

  /**
   * Adding `or where not null` clause
   */
  public orWhereNotNull (key: any): this {
    this.$knexBuilder.orWhereNotNull(key)
    return this
  }

  /**
   * Alias for [[whereNotNull]]
   */
  public andWhereNotNull (key: any): this {
    return this.whereNotNull(key)
  }

  /**
   * Add a `where exists` clause
   */
  public whereExists (value: any) {
    this.$knexBuilder.whereExists(this.$transformValue(value))
    return this
  }

  /**
   * Add a `or where exists` clause
   */
  public orWhereExists (value: any) {
    this.$knexBuilder.orWhereExists(this.$transformValue(value))
    return this
  }

  /**
   * Alias for [[whereExists]]
   */
  public andWhereExists (value: any) {
    return this.whereExists(value)
  }

  /**
   * Add a `where not exists` clause
   */
  public whereNotExists (value: any) {
    this.$knexBuilder.whereNotExists(this.$transformValue(value))
    return this
  }

  /**
   * Add a `or where not exists` clause
   */
  public orWhereNotExists (value: any) {
    this.$knexBuilder.orWhereNotExists(this.$transformValue(value))
    return this
  }

  /**
   * Alias for [[whereNotExists]]
   */
  public andWhereNotExists (value: any) {
    return this.whereNotExists(value)
  }

  /**
   * Add where between clause
   */
  public whereBetween (key: any, value: [any, any]): this {
    this.$knexBuilder.whereBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Add where between clause
   */
  public orWhereBetween (key: any, value: any): this {
    this.$knexBuilder.orWhereBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Alias for [[whereBetween]]
   */
  public andWhereBetween (key: any, value: any): this {
    return this.whereBetween(key, value)
  }

  /**
   * Add where between clause
   */
  public whereNotBetween (key: any, value: any): this {
    this.$knexBuilder.whereNotBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Add where between clause
   */
  public orWhereNotBetween (key: any, value: any): this {
    this.$knexBuilder.orWhereNotBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Alias for [[whereNotBetween]]
   */
  public andWhereNotBetween (key: any, value: any): this {
    return this.whereNotBetween(key, value)
  }

  /**
   * Adding a where clause using raw sql
   */
  public whereRaw (sql: any, bindings?: any): this {
    if (bindings) {
      this.$knexBuilder.whereRaw(sql, bindings)
    } else {
      this.$knexBuilder.whereRaw(this.$transformRaw(sql))
    }

    return this
  }

  /**
   * Adding a or where clause using raw sql
   */
  public orWhereRaw (sql: any, bindings?: any): this {
    if (bindings) {
      this.$knexBuilder.orWhereRaw(sql, bindings)
    } else {
      this.$knexBuilder.orWhereRaw(this.$transformRaw(sql))
    }
    return this
  }

  /**
   * Alias for [[whereRaw]]
   */
  public andWhereRaw (sql: any, bindings?: any): this {
    return this.whereRaw(sql, bindings)
  }

  /**
   * Add a join clause
   */
  public join (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.join(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.join(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.join(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add an inner join clause
   */
  public innerJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.innerJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.innerJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.innerJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add a left join clause
   */
  public leftJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.leftJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.leftJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.leftJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add a left outer join clause
   */
  public leftOuterJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.leftOuterJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.leftOuterJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.leftOuterJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add a right join clause
   */
  public rightJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.rightJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.rightJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.rightJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add a right outer join clause
   */
  public rightOuterJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.rightOuterJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.rightOuterJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.rightOuterJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add a full outer join clause
   */
  public fullOuterJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.fullOuterJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.fullOuterJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.fullOuterJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add a cross join clause
   */
  public crossJoin (table: any, first: any, operator?: any, second?: any): this {
    if (second) {
      this.$knexBuilder.crossJoin(table, first, operator, this.$transformRaw(second))
    } else if (operator) {
      this.$knexBuilder.crossJoin(table, first, this.$transformRaw(operator))
    } else {
      this.$knexBuilder.crossJoin(table, this.$transformRaw(first))
    }

    return this
  }

  /**
   * Add join clause as a raw query
   */
  public joinRaw (sql: any, bindings?: any) {
    if (bindings) {
      this.$knexBuilder.joinRaw(sql, bindings)
    } else {
      this.$knexBuilder.joinRaw(this.$transformRaw(sql))
    }

    return this
  }

  /**
   * Adds a having clause. The having clause breaks for `postgreSQL` when
   * referencing alias columns, since PG doesn't support alias columns
   * being referred within `having` clause. The end user has to
   * use raw queries in this case.
   */
  public having (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.having(key, operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.having(key, this.$transformValue(operator))
    } else {
      this.$knexBuilder.having(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Adds or having clause. The having clause breaks for `postgreSQL` when
   * referencing alias columns, since PG doesn't support alias columns
   * being referred within `having` clause. The end user has to
   * use raw queries in this case.
   */
  public orHaving (key: any, operator?: any, value?: any): this {
    if (value) {
      this.$knexBuilder.orHaving(key, operator, this.$transformValue(value))
    } else if (operator) {
      this.$knexBuilder.orHaving(key, this.$transformValue(operator))
    } else {
      this.$knexBuilder.orHaving(this.$transformCallback(key))
    }

    return this
  }

  /**
   * Alias for [[having]]
   */
  public andHaving (key: any, operator?: any, value?: any): this {
    return this.having(key, operator, value)
  }

  /**
   * Adding having in clause to the query
   */
  public havingIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder.havingIn(key, value)
    return this
  }

  /**
   * Adding or having in clause to the query
   */
  public orHavingIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder['orHavingIn'](key, value)
    return this
  }

  /**
   * Alias for [[havingIn]]
   */
  public andHavingIn (key: any, value: any) {
    return this.havingIn(key, value)
  }

  /**
   * Adding having not in clause to the query
   */
  public havingNotIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder['havingNotIn'](key, value)
    return this
  }

  /**
   * Adding or having not in clause to the query
   */
  public orHavingNotIn (key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.$transformValue(one))
      : this.$transformValue(value)

    this.$knexBuilder['orHavingNotIn'](key, value)
    return this
  }

  /**
   * Alias for [[havingNotIn]]
   */
  public andHavingNotIn (key: any, value: any) {
    return this.havingNotIn(key, value)
  }

  /**
   * Adding having null clause
   */
  public havingNull (key: any): this {
    this.$knexBuilder['havingNull'](key)
    return this
  }

  /**
   * Adding or having null clause
   */
  public orHavingNull (key: any): this {
    this.$knexBuilder['orHavingNull'](key)
    return this
  }

  /**
   * Alias for [[havingNull]] clause
   */
  public andHavingNull (key: any): this {
    return this.havingNull(key)
  }

  /**
   * Adding having not null clause
   */
  public havingNotNull (key: any): this {
    this.$knexBuilder['havingNotNull'](key)
    return this
  }

  /**
   * Adding or having not null clause
   */
  public orHavingNotNull (key: any): this {
    this.$knexBuilder['orHavingNotNull'](key)
    return this
  }

  /**
   * Alias for [[havingNotNull]] clause
   */
  public andHavingNotNull (key: any): this {
    return this.havingNotNull(key)
  }

  /**
   * Adding `having exists` clause
   */
  public havingExists (value: any): this {
    this.$knexBuilder['havingExists'](this.$transformValue(value))
    return this
  }

  /**
   * Adding `or having exists` clause
   */
  public orHavingExists (value: any): this {
    this.$knexBuilder['orHavingExists'](this.$transformValue(value))
    return this
  }

  /**
   * Alias for [[havingExists]]
   */
  public andHavingExists (value: any): this {
    return this.havingExists(value)
  }

    /**
   * Adding `having not exists` clause
   */
  public havingNotExists (value: any): this {
    this.$knexBuilder['havingNotExists'](this.$transformValue(value))
    return this
  }

  /**
   * Adding `or having not exists` clause
   */
  public orHavingNotExists (value: any): this {
    this.$knexBuilder['orHavingNotExists'](this.$transformValue(value))
    return this
  }

  /**
   * Alias for [[havingNotExists]]
   */
  public andHavingNotExists (value: any): this {
    return this.havingNotExists(value)
  }

  /**
   * Adding `having between` clause
   */
  public havingBetween (key: any, value: any): this {
    this.$knexBuilder.havingBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Adding `or having between` clause
   */
  public orHavingBetween (key: any, value: any): this {
    this.$knexBuilder.orHavingBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Alias for [[havingBetween]]
   */
  public andHavingBetween (key: any, value: any): this {
    return this.havingBetween(key, value)
  }

  /**
   * Adding `having not between` clause
   */
  public havingNotBetween (key: any, value: any): this {
    this.$knexBuilder.havingNotBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Adding `or having not between` clause
   */
  public orHavingNotBetween (key: any, value: any): this {
    this.$knexBuilder.orHavingNotBetween(key, this._getBetweenPair(value))
    return this
  }

  /**
   * Alias for [[havingNotBetween]]
   */
  public andHavingNotBetween (key: any, value: any): this {
    return this.havingNotBetween(key, value)
  }

  /**
   * Adding a where clause using raw sql
   */
  public havingRaw (sql: any, bindings?: any): this {
    if (bindings) {
      this.$knexBuilder.havingRaw(sql, bindings)
    } else {
      this.$knexBuilder.havingRaw(this.$transformRaw(sql))
    }

    return this
  }

  /**
   * Adding a where clause using raw sql
   */
  public orHavingRaw (sql: any, bindings?: any): this {
    if (bindings) {
      this.$knexBuilder.orHavingRaw(sql, bindings)
    } else {
      this.$knexBuilder.orHavingRaw(this.$transformRaw(sql))
    }

    return this
  }

  /**
   * Alias for [[havingRaw]]
   */
  public andHavingRaw (sql: any, bindings?: any): this {
    return this.havingRaw(sql, bindings)
  }

  /**
   * Add distinct clause
   */
  public distinct (...columns: any[]): this {
    this.$knexBuilder.distinct(...columns)
    return this
  }

  /**
   * Add group by clause
   */
  public groupBy (...columns: any[]): this {
    this.$knexBuilder.groupBy(...columns)
    return this
  }

  /**
   * Add group by clause as a raw query
   */
  public groupByRaw (sql: any, bindings?: any): this {
    if (bindings) {
      this.$knexBuilder.groupByRaw(sql, bindings)
    } else {
      this.$knexBuilder.groupByRaw(this.$transformRaw(sql))
    }

    return this
  }

  /**
   * Add order by clause
   */
  public orderBy (column: any, direction?: any): this {
    this.$knexBuilder.orderBy(column, direction)
    return this
  }

  /**
   * Add order by clause as a raw query
   */
  public orderByRaw (sql: any, bindings?: any): this {
    if (bindings) {
      this.$knexBuilder.orderByRaw(sql, bindings)
    } else {
      this.$knexBuilder.orderByRaw(this.$transformRaw(sql))
    }

    return this
  }

  /**
   * Define select offset
   */
  public offset (value: number): this {
    this.$knexBuilder.offset(value)
    return this
  }

  /**
   * Define results limit
   */
  public limit (value: number): this {
    this.$knexBuilder.limit(value)
    return this
  }

  /**
   * Define union queries
   */
  public union (queries: any, wrap?: boolean): this {
    queries = Array.isArray(queries)
      ? queries.map((one) => this.$transformValue(one))
      : this.$transformValue(queries)

    wrap ? this.$knexBuilder.union(queries, wrap) : this.$knexBuilder.union(queries)
    return this
  }

  /**
   * Define union all queries
   */
  public unionAll (queries: any, wrap?: boolean): this {
    queries = Array.isArray(queries)
      ? queries.map((one) => this.$transformValue(one))
      : this.$transformValue(queries)

    wrap ? this.$knexBuilder.unionAll(queries, wrap) : this.$knexBuilder.unionAll(queries)
    return this
  }

  /**
   * Define intersect queries
   */
  public intersect (queries: any, wrap?: boolean): this {
    queries = Array.isArray(queries)
      ? queries.map((one) => this.$transformValue(one))
      : this.$transformValue(queries)

    wrap ? this.$knexBuilder.intersect(queries, wrap) : this.$knexBuilder.intersect(queries)
    return this
  }

  /**
   * Clear select columns
   */
  public clearSelect (): this {
    this.$knexBuilder.clearSelect()
    return this
  }

  /**
   * Clear where clauses
   */
  public clearWhere (): this {
    this.$knexBuilder.clearWhere()
    return this
  }

  /**
   * Clear order by
   */
  public clearOrder (): this {
    this.$knexBuilder.clearOrder()
    return this
  }

  /**
   * Clear having
   */
  public clearHaving (): this {
    this.$knexBuilder.clearHaving()
    return this
  }

  /**
   * Specify `FOR UPDATE` lock mode for a given
   * query
   */
  public forUpdate (...tableNames: string[]): this {
    this.$knexBuilder.forUpdate(...tableNames)

    return this
  }

  /**
   * Specify `FOR SHARE` lock mode for a given
   * query
   */
  public forShare (...tableNames: string[]): this {
    this.$knexBuilder.forShare(...tableNames)

    return this
  }

  /**
   * Skip locked rows
   */
  public skipLocked (): this {
    this.$knexBuilder.skipLocked()
    return this
  }

  /**
   * Fail when query wants a locked row
   */
  public noWait (): this {
    this.$knexBuilder.noWait()
    return this
  }

  /**
   * Define `with` CTE
   */
  public with (alias: any, query: any): this {
    this.$knexBuilder.with(alias, query)
    return this
  }

  /**
   * Define `with` CTE with recursive keyword
   */
  public withRecursive (alias: any, query: any): this {
    this.$knexBuilder.withRecursive(alias, query)
    return this
  }

  /**
   * Define schema for the table
   */
  public withSchema (schema: any): this {
    this.$knexBuilder.withSchema(schema)
    return this
  }

  /**
   * Define table alias
   */
  public as (alias: any): this {
    this.$knexBuilder.as(alias)
    return this
  }
}

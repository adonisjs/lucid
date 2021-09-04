/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../../adonis-typings/index.ts" />

import { Knex } from 'knex'
import { Macroable } from 'macroable'
import { Exception } from '@poppinss/utils'
import { ChainableContract, DBQueryCallback } from '@ioc:Adonis/Lucid/Database'

import { isObject } from '../../utils'
import { RawQueryBuilder } from './Raw'
import { RawBuilder } from '../StaticBuilder/Raw'
import { ReferenceBuilder } from '../StaticBuilder/Reference'

const WRAPPING_METHODS = ['where', 'orWhere', 'whereNot', 'orWhereNot']

/**
 * The chainable query builder to consturct SQL queries for selecting, updating and
 * deleting records.
 *
 * The API internally uses the knex query builder. However, many of methods may have
 * different API.
 */
export abstract class Chainable extends Macroable implements ChainableContract {
  public hasAggregates: boolean = false
  public hasGroupBy: boolean = false
  public hasUnion: boolean = false

  /**
   * Collection where clauses in a 2nd array. Calling `wrapExisting`
   * adds a new stack item
   */
  private whereStack: any[][] = [[]]

  /**
   * Returns the recent most array from the where stack
   */
  private getRecentStackItem() {
    return this.whereStack[this.whereStack.length - 1]
  }

  /**
   * Returns the wrapping method for a given where method
   */
  private getWrappingMethod(method: string) {
    if (WRAPPING_METHODS.includes(method)) {
      return {
        method: 'where',
        wrappingMethod: method,
      }
    }

    if (method.startsWith('or')) {
      return {
        method: method,
        wrappingMethod: 'orWhere',
      }
    }

    return {
      method: method,
      wrappingMethod: 'where',
    }
  }

  /**
   * Applies the where clauses
   */
  protected applyWhere() {
    this.knexQuery.clearWhere()

    if (this.whereStack.length === 1) {
      this.whereStack[0].forEach(({ method, args }) => {
        this.knexQuery[method](...args)
      })
      return
    }

    this.whereStack.forEach((collection) => {
      const firstItem = collection.shift()
      const wrapper = this.getWrappingMethod(firstItem.method)
      this.knexQuery[wrapper.wrappingMethod]((subquery) => {
        subquery[wrapper.method](...firstItem.args)
        collection.forEach(({ method, args }) => subquery[method](...args))
      })
    })
  }

  /**
   * An array of selected columns
   */
  public get columns(): ChainableContract['columns'] {
    return this.knexQuery['_statements']
      .filter(({ grouping }) => grouping === 'columns')
      .reduce((result: ChainableContract['columns'], { value }) => {
        result = result.concat(value)
        return result
      }, [])
  }

  /**
   * Custom alias for the query results. Ignored if it not a
   * subquery
   */
  public subQueryAlias?: string

  constructor(
    public knexQuery: Knex.QueryBuilder,
    private queryCallback: DBQueryCallback,
    public keysResolver?: (columnName: string) => string
  ) {
    super()
  }

  /**
   * Raises exception when only one argument is passed to a where
   * clause and it is a string. It means the value is undefined
   */
  private validateWhereSingleArgument(value: any, method: string) {
    if (typeof value === 'string') {
      throw new Exception(`".${method}" expects value to be defined, but undefined is passed`)
    }
  }

  /**
   * Returns the value pair for the `whereBetween` clause
   */
  private getBetweenPair(value: any[]): any {
    const [lhs, rhs] = value
    if (lhs === undefined || rhs === undefined) {
      throw new Error('Invalid array for whereBetween value')
    }

    return [this.transformValue(lhs), this.transformValue(rhs)]
  }

  /**
   * Normalizes the columns aggregates functions to something
   * knex can process.
   */
  private normalizeAggregateColumns(columns: any, alias?: any): any {
    if (columns.constructor === Object) {
      return Object.keys(columns).reduce((result, key) => {
        const value = columns[key]
        result[key] =
          typeof value === 'string' ? this.resolveKey(value) : this.transformValue(value)
        return result
      }, {})
    }

    if (!alias) {
      return columns
    }

    return {
      [alias]:
        typeof columns === 'string' ? this.resolveKey(columns) : this.transformValue(columns),
    }
  }

  /**
   * Resolves column names
   */
  protected resolveKey(columns: any, checkForObject: boolean = false, returnValue?: any): any {
    /**
     * If there is no keys resolver in place, then return the
     * optional return value or defined column(s)
     */
    if (!this.keysResolver) {
      return returnValue || columns
    }

    /**
     * If column is a string, then resolve it as a key
     */
    if (typeof columns === 'string') {
      return columns === '*' ? columns : this.keysResolver(columns)
    }

    /**
     * If check for objects is enabled, then resolve object keys
     */
    if (checkForObject && isObject(columns)) {
      return Object.keys(columns).reduce((result, column) => {
        result[this.keysResolver!(column)] = columns[column]
        return result
      }, {})
    }

    /**
     * Return the return value or columns as fallback
     */
    return returnValue || columns
  }

  /**
   * Apply existing query flags to a new query builder. This is
   * done during clone operation
   */
  protected applyQueryFlags(query: Chainable) {
    query.hasAggregates = this.hasAggregates
    query.hasGroupBy = this.hasGroupBy
    query.hasUnion = this.hasUnion
    query.whereStack = this.whereStack.map((collection) => {
      return collection.map((node) => node)
    })
  }

  /**
   * Transforms the value to something that knex can internally understand and
   * handle. It includes.
   *
   * 1. Returning the `knexBuilder` for sub queries.
   * 2. Returning the `knex.refBuilder` for reference builder.
   * 2. Returning the `knexBuilder` for raw queries.
   * 3. Wrapping callbacks, so that the end user receives an instance Lucid query
   *    builder and not knex query builder.
   */
  protected transformValue(value: any) {
    if (value instanceof Chainable) {
      value.applyWhere()
      return value.knexQuery
    }

    if (value instanceof ReferenceBuilder) {
      return value.toKnex(this.knexQuery.client)
    }

    if (typeof value === 'function') {
      return this.transformCallback(value)
    }

    return this.transformRaw(value)
  }

  /**
   * Transforms the user callback to something that knex
   * can internally process
   */
  protected transformCallback(value: any) {
    if (typeof value === 'function') {
      return this.queryCallback(value, this.keysResolver)
    }

    return value
  }

  /**
   * Returns the underlying knex raw query builder for Lucid raw
   * query builder
   */
  protected transformRaw(value: any) {
    if (value instanceof RawQueryBuilder) {
      return value['knexQuery']
    }

    if (value instanceof RawBuilder) {
      return value.toKnex(this.knexQuery.client)
    }

    return value
  }

  /**
   * Define columns for selection
   */
  public select(...args: any[]): this {
    let columns = args
    if (Array.isArray(args[0])) {
      columns = args[0]
    }

    this.knexQuery.select(
      columns.map((column) => {
        if (typeof column === 'string') {
          return this.resolveKey(column, true)
        }
        return this.transformValue(column)
      })
    )
    return this
  }

  /**
   * Select table for the query. Re-calling this method multiple times will
   * use the last selected table
   */
  public from(table: any): this {
    this.knexQuery.from(this.transformValue(table))
    return this
  }

  /**
   * Wrap existing where clauses to its own group
   */
  public wrapExisting(): this {
    if (this.getRecentStackItem().length) {
      this.whereStack.push([])
    }
    return this
  }

  /**
   * Add a `where` clause
   */
  public where(key: any, operator?: any, value?: any): this {
    const whereClauses = this.getRecentStackItem()

    if (value !== undefined) {
      whereClauses.push({
        method: 'where',
        args: [this.resolveKey(key), operator, this.transformValue(value)],
      })
    } else if (operator !== undefined) {
      whereClauses.push({
        method: 'where',
        args: [this.resolveKey(key), this.transformValue(operator)],
      })
    } else {
      /**
       * Only callback is allowed as a standalone param. One must use `whereRaw`
       * for raw/sub queries. This is our limitation to have consistent API
       */
      this.validateWhereSingleArgument(key, 'where')
      whereClauses.push({
        method: 'where',
        args: [this.resolveKey(key, true, this.transformCallback(key))],
      })
    }

    return this
  }

  /**
   * Add a `or where` clause
   */
  public orWhere(key: any, operator?: any, value?: any): this {
    const whereClauses = this.getRecentStackItem()

    if (value !== undefined) {
      whereClauses.push({
        method: 'orWhere',
        args: [this.resolveKey(key), operator, this.transformValue(value)],
      })
    } else if (operator !== undefined) {
      whereClauses.push({
        method: 'orWhere',
        args: [this.resolveKey(key), this.transformValue(operator)],
      })
    } else {
      this.validateWhereSingleArgument(key, 'orWhere')
      whereClauses.push({
        method: 'orWhere',
        args: [this.resolveKey(key, true, this.transformCallback(key))],
      })
    }

    return this
  }

  /**
   * Alias for `where`
   */
  public andWhere(key: any, operator?: any, value?: any): this {
    return this.where(key, operator, value)
  }

  /**
   * Adding `where not` clause
   */
  public whereNot(key: any, operator?: any, value?: any): this {
    const whereClauses = this.getRecentStackItem()

    if (value !== undefined) {
      whereClauses.push({
        method: 'whereNot',
        args: [this.resolveKey(key), operator, this.transformValue(value)],
      })
    } else if (operator !== undefined) {
      whereClauses.push({
        method: 'whereNot',
        args: [this.resolveKey(key), this.transformValue(operator)],
      })
    } else {
      this.validateWhereSingleArgument(key, 'whereNot')
      whereClauses.push({
        method: 'whereNot',
        args: [this.resolveKey(key, true, this.transformCallback(key))],
      })
    }

    return this
  }

  /**
   * Adding `or where not` clause
   */
  public orWhereNot(key: any, operator?: any, value?: any): this {
    const whereClauses = this.getRecentStackItem()

    if (value !== undefined) {
      whereClauses.push({
        method: 'orWhereNot',
        args: [this.resolveKey(key), operator, this.transformValue(value)],
      })
    } else if (operator !== undefined) {
      whereClauses.push({
        method: 'orWhereNot',
        args: [this.resolveKey(key), this.transformValue(operator)],
      })
    } else {
      this.validateWhereSingleArgument(key, 'orWhereNot')
      whereClauses.push({
        method: 'orWhereNot',
        args: [this.resolveKey(key, true, this.transformCallback(key))],
      })
    }

    return this
  }

  /**
   * Alias for [[whereNot]]
   */
  public andWhereNot(key: any, operator?: any, value?: any): this {
    return this.whereNot(key, operator, value)
  }

  /**
   * Add a where clause on a given column
   */
  public whereColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.where(column, operator, new ReferenceBuilder(comparisonColumn, this.knexQuery.client))
    } else {
      this.where(column, new ReferenceBuilder(operator, this.knexQuery.client))
    }
    return this
  }

  /**
   * Add a orWhere clause on a given column
   */
  public orWhereColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.orWhere(column, operator, new ReferenceBuilder(comparisonColumn, this.knexQuery.client))
    } else {
      this.orWhere(column, new ReferenceBuilder(operator, this.knexQuery.client))
    }
    return this
  }

  /**
   * Alias for whereColumn
   */
  public andWhereColumn(column: any, operator: any, comparisonColumn?: any): this {
    return this.whereColumn(column, operator, comparisonColumn)
  }

  /**
   * Add a whereNot clause on a given column
   */
  public whereNotColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.whereNot(column, operator, new ReferenceBuilder(comparisonColumn, this.knexQuery.client))
    } else {
      this.whereNot(column, new ReferenceBuilder(operator, this.knexQuery.client))
    }
    return this
  }

  /**
   * Add a orWhereNotColumn clause on a given column
   */
  public orWhereNotColumn(column: any, operator: any, comparisonColumn?: any): this {
    if (comparisonColumn !== undefined) {
      this.orWhereNot(
        column,
        operator,
        new ReferenceBuilder(comparisonColumn, this.knexQuery.client)
      )
    } else {
      this.orWhereNot(column, new ReferenceBuilder(operator, this.knexQuery.client))
    }
    return this
  }

  /**
   * Alias for whereNotColumn
   */
  public andWhereNotColumn(column: any, operator: any, comparisonColumn?: any): this {
    return this.whereNotColumn(column, operator, comparisonColumn)
  }

  /**
   * Adding a `where in` clause
   */
  public whereIn(columns: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    columns = Array.isArray(columns)
      ? columns.map((column) => this.resolveKey(column))
      : this.resolveKey(columns)

    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereIn',
      args: [columns, value],
    })
    return this
  }

  /**
   * Adding a `or where in` clause
   */
  public orWhereIn(columns: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    columns = Array.isArray(columns)
      ? columns.map((column) => this.resolveKey(column))
      : this.resolveKey(columns)

    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereIn',
      args: [columns, value],
    })
    return this
  }

  /**
   * Alias for [[whereIn]]
   */
  public andWhereIn(key: any, value: any): this {
    return this.whereIn(key, value)
  }

  /**
   * Adding a `where not in` clause
   */
  public whereNotIn(columns: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    columns = Array.isArray(columns)
      ? columns.map((column) => this.resolveKey(column))
      : this.resolveKey(columns)

    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereNotIn',
      args: [columns, value],
    })
    return this
  }

  /**
   * Adding a `or where not in` clause
   */
  public orWhereNotIn(columns: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    columns = Array.isArray(columns)
      ? columns.map((column) => this.resolveKey(column))
      : this.resolveKey(columns)

    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereNotIn',
      args: [columns, value],
    })
    return this
  }

  /**
   * Alias for [[whereNotIn]]
   */
  public andWhereNotIn(key: any, value: any): this {
    return this.whereNotIn(key, value)
  }

  /**
   * Adding `where not null` clause
   */
  public whereNull(key: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereNull',
      args: [this.resolveKey(key)],
    })
    return this
  }

  /**
   * Adding `or where not null` clause
   */
  public orWhereNull(key: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereNull',
      args: [this.resolveKey(key)],
    })
    return this
  }

  /**
   * Alias for [[whereNull]]
   */
  public andWhereNull(key: any): this {
    return this.whereNull(key)
  }

  /**
   * Adding `where not null` clause
   */
  public whereNotNull(key: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereNotNull',
      args: [this.resolveKey(key)],
    })
    return this
  }

  /**
   * Adding `or where not null` clause
   */
  public orWhereNotNull(key: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereNotNull',
      args: [this.resolveKey(key)],
    })
    return this
  }

  /**
   * Alias for [[whereNotNull]]
   */
  public andWhereNotNull(key: any): this {
    return this.whereNotNull(key)
  }

  /**
   * Add a `where exists` clause
   */
  public whereExists(value: any) {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereExists',
      args: [this.transformValue(value)],
    })
    return this
  }

  /**
   * Add a `or where exists` clause
   */
  public orWhereExists(value: any) {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereExists',
      args: [this.transformValue(value)],
    })
    return this
  }

  /**
   * Alias for [[whereExists]]
   */
  public andWhereExists(value: any) {
    return this.whereExists(value)
  }

  /**
   * Add a `where not exists` clause
   */
  public whereNotExists(value: any) {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereNotExists',
      args: [this.transformValue(value)],
    })
    return this
  }

  /**
   * Add a `or where not exists` clause
   */
  public orWhereNotExists(value: any) {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereNotExists',
      args: [this.transformValue(value)],
    })
    return this
  }

  /**
   * Alias for [[whereNotExists]]
   */
  public andWhereNotExists(value: any) {
    return this.whereNotExists(value)
  }

  /**
   * Add where between clause
   */
  public whereBetween(key: any, value: [any, any]): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereBetween',
      args: [this.resolveKey(key), this.getBetweenPair(value)],
    })
    return this
  }

  /**
   * Add where between clause
   */
  public orWhereBetween(key: any, value: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereBetween',
      args: [this.resolveKey(key), this.getBetweenPair(value)],
    })
    return this
  }

  /**
   * Alias for [[whereBetween]]
   */
  public andWhereBetween(key: any, value: any): this {
    return this.whereBetween(key, value)
  }

  /**
   * Add where between clause
   */
  public whereNotBetween(key: any, value: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'whereNotBetween',
      args: [this.resolveKey(key), this.getBetweenPair(value)],
    })
    return this
  }

  /**
   * Add where between clause
   */
  public orWhereNotBetween(key: any, value: any): this {
    const whereClauses = this.getRecentStackItem()
    whereClauses.push({
      method: 'orWhereNotBetween',
      args: [this.resolveKey(key), this.getBetweenPair(value)],
    })
    return this
  }

  /**
   * Alias for [[whereNotBetween]]
   */
  public andWhereNotBetween(key: any, value: any): this {
    return this.whereNotBetween(key, value)
  }

  /**
   * Adding a where clause using raw sql
   */
  public whereRaw(sql: any, bindings?: any): this {
    const whereClauses = this.getRecentStackItem()

    if (bindings) {
      bindings = Array.isArray(bindings)
        ? bindings.map((binding) => this.transformValue(binding))
        : bindings

      whereClauses.push({
        method: 'whereRaw',
        args: [sql, bindings],
      })
    } else {
      whereClauses.push({
        method: 'whereRaw',
        args: [this.transformRaw(sql)],
      })
    }

    return this
  }

  /**
   * Adding a or where clause using raw sql
   */
  public orWhereRaw(sql: any, bindings?: any): this {
    const whereClauses = this.getRecentStackItem()

    if (bindings) {
      bindings = Array.isArray(bindings)
        ? bindings.map((binding) => this.transformValue(binding))
        : bindings

      whereClauses.push({
        method: 'orWhereRaw',
        args: [sql, bindings],
      })
    } else {
      whereClauses.push({
        method: 'orWhereRaw',
        args: [this.transformRaw(sql)],
      })
    }
    return this
  }

  /**
   * Alias for [[whereRaw]]
   */
  public andWhereRaw(sql: any, bindings?: any): this {
    return this.whereRaw(sql, bindings)
  }

  /**
   * Add a join clause
   */
  public join(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.join(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.join(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.join(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add an inner join clause
   */
  public innerJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.innerJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.innerJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.innerJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add a left join clause
   */
  public leftJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.leftJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.leftJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.leftJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add a left outer join clause
   */
  public leftOuterJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.leftOuterJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.leftOuterJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.leftOuterJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add a right join clause
   */
  public rightJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.rightJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.rightJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.rightJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add a right outer join clause
   */
  public rightOuterJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.rightOuterJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.rightOuterJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.rightOuterJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add a full outer join clause
   */
  public fullOuterJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.fullOuterJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.fullOuterJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.fullOuterJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add a cross join clause
   */
  public crossJoin(table: any, first: any, operator?: any, second?: any): this {
    if (second !== undefined) {
      this.knexQuery.crossJoin(table, first, operator, this.transformRaw(second))
    } else if (operator !== undefined) {
      this.knexQuery.crossJoin(table, first, this.transformRaw(operator))
    } else {
      this.knexQuery.crossJoin(table, this.transformRaw(first))
    }

    return this
  }

  /**
   * Add join clause as a raw query
   */
  public joinRaw(sql: any, bindings?: any) {
    if (bindings) {
      this.knexQuery.joinRaw(sql, bindings)
    } else {
      this.knexQuery.joinRaw(this.transformRaw(sql))
    }

    return this
  }

  /**
   * Adds a having clause. The having clause breaks for `postgreSQL` when
   * referencing alias columns, since PG doesn't support alias columns
   * being referred within `having` clause. The end user has to
   * use raw queries in this case.
   */
  public having(key: any, operator?: any, value?: any): this {
    if (value !== undefined) {
      this.knexQuery.having(this.resolveKey(key), operator, this.transformValue(value))
      return this
    }

    if (operator !== undefined) {
      throw new Exception(
        'Invalid arguments for "queryBuilder.having". Excepts a callback or key-value pair along with an operator'
      )
    }

    this.knexQuery.having(this.transformValue(key))
    return this
  }

  /**
   * Adds or having clause. The having clause breaks for `postgreSQL` when
   * referencing alias columns, since PG doesn't support alias columns
   * being referred within `having` clause. The end user has to
   * use raw queries in this case.
   */
  public orHaving(key: any, operator?: any, value?: any): this {
    if (value !== undefined) {
      this.knexQuery.orHaving(this.resolveKey(key), operator, this.transformValue(value))
      return this
    }

    if (operator !== undefined) {
      throw new Exception(
        'Invalid arguments for "queryBuilder.orHaving". Excepts a callback or key-value pair along with an operator'
      )
    }

    this.knexQuery.orHaving(this.transformValue(key))
    return this
  }

  /**
   * Alias for [[having]]
   */
  public andHaving(key: any, operator?: any, value?: any): this {
    return this.having(key, operator, value)
  }

  /**
   * Adding having in clause to the query
   */
  public havingIn(key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    this.knexQuery.havingIn(this.resolveKey(key), value)
    return this
  }

  /**
   * Adding or having in clause to the query
   */
  public orHavingIn(key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    this.knexQuery['orHavingIn'](this.resolveKey(key), value)
    return this
  }

  /**
   * Alias for [[havingIn]]
   */
  public andHavingIn(key: any, value: any) {
    return this.havingIn(key, value)
  }

  /**
   * Adding having not in clause to the query
   */
  public havingNotIn(key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    this.knexQuery['havingNotIn'](this.resolveKey(key), value)
    return this
  }

  /**
   * Adding or having not in clause to the query
   */
  public orHavingNotIn(key: any, value: any): this {
    value = Array.isArray(value)
      ? value.map((one) => this.transformValue(one))
      : this.transformValue(value)

    this.knexQuery['orHavingNotIn'](this.resolveKey(key), value)
    return this
  }

  /**
   * Alias for [[havingNotIn]]
   */
  public andHavingNotIn(key: any, value: any) {
    return this.havingNotIn(key, value)
  }

  /**
   * Adding having null clause
   */
  public havingNull(key: any): this {
    this.knexQuery['havingNull'](this.resolveKey(key))
    return this
  }

  /**
   * Adding or having null clause
   */
  public orHavingNull(key: any): this {
    this.knexQuery['orHavingNull'](this.resolveKey(key))
    return this
  }

  /**
   * Alias for [[havingNull]] clause
   */
  public andHavingNull(key: any): this {
    return this.havingNull(key)
  }

  /**
   * Adding having not null clause
   */
  public havingNotNull(key: any): this {
    this.knexQuery['havingNotNull'](this.resolveKey(key))
    return this
  }

  /**
   * Adding or having not null clause
   */
  public orHavingNotNull(key: any): this {
    this.knexQuery['orHavingNotNull'](this.resolveKey(key))
    return this
  }

  /**
   * Alias for [[havingNotNull]] clause
   */
  public andHavingNotNull(key: any): this {
    return this.havingNotNull(key)
  }

  /**
   * Adding `having exists` clause
   */
  public havingExists(value: any): this {
    this.knexQuery['havingExists'](this.transformValue(value))
    return this
  }

  /**
   * Adding `or having exists` clause
   */
  public orHavingExists(value: any): this {
    this.knexQuery['orHavingExists'](this.transformValue(value))
    return this
  }

  /**
   * Alias for [[havingExists]]
   */
  public andHavingExists(value: any): this {
    return this.havingExists(value)
  }

  /**
   * Adding `having not exists` clause
   */
  public havingNotExists(value: any): this {
    this.knexQuery['havingNotExists'](this.transformValue(value))
    return this
  }

  /**
   * Adding `or having not exists` clause
   */
  public orHavingNotExists(value: any): this {
    this.knexQuery['orHavingNotExists'](this.transformValue(value))
    return this
  }

  /**
   * Alias for [[havingNotExists]]
   */
  public andHavingNotExists(value: any): this {
    return this.havingNotExists(value)
  }

  /**
   * Adding `having between` clause
   */
  public havingBetween(key: any, value: any): this {
    this.knexQuery.havingBetween(this.resolveKey(key), this.getBetweenPair(value))
    return this
  }

  /**
   * Adding `or having between` clause
   */
  public orHavingBetween(key: any, value: any): this {
    this.knexQuery.orHavingBetween(this.resolveKey(key), this.getBetweenPair(value))
    return this
  }

  /**
   * Alias for [[havingBetween]]
   */
  public andHavingBetween(key: any, value: any): this {
    return this.havingBetween(this.resolveKey(key), value)
  }

  /**
   * Adding `having not between` clause
   */
  public havingNotBetween(key: any, value: any): this {
    this.knexQuery.havingNotBetween(this.resolveKey(key), this.getBetweenPair(value))
    return this
  }

  /**
   * Adding `or having not between` clause
   */
  public orHavingNotBetween(key: any, value: any): this {
    this.knexQuery.orHavingNotBetween(this.resolveKey(key), this.getBetweenPair(value))
    return this
  }

  /**
   * Alias for [[havingNotBetween]]
   */
  public andHavingNotBetween(key: any, value: any): this {
    return this.havingNotBetween(key, value)
  }

  /**
   * Adding a where clause using raw sql
   */
  public havingRaw(sql: any, bindings?: any): this {
    if (bindings) {
      this.knexQuery.havingRaw(sql, bindings)
    } else {
      this.knexQuery.havingRaw(this.transformRaw(sql))
    }

    return this
  }

  /**
   * Adding a where clause using raw sql
   */
  public orHavingRaw(sql: any, bindings?: any): this {
    if (bindings) {
      this.knexQuery.orHavingRaw(sql, bindings)
    } else {
      this.knexQuery.orHavingRaw(this.transformRaw(sql))
    }

    return this
  }

  /**
   * Alias for [[havingRaw]]
   */
  public andHavingRaw(sql: any, bindings?: any): this {
    return this.havingRaw(sql, bindings)
  }

  /**
   * Add distinct clause
   */
  public distinct(...columns: any[]): this {
    this.knexQuery.distinct(...columns.map((column) => this.resolveKey(column)))
    return this
  }

  /**
   * Add distinctOn clause
   */
  public distinctOn(...columns: any[]): this {
    this.knexQuery.distinctOn(...columns.map((column) => this.resolveKey(column)))
    return this
  }

  /**
   * Add group by clause
   */
  public groupBy(...columns: any[]): this {
    this.hasGroupBy = true
    this.knexQuery.groupBy(...columns.map((column) => this.resolveKey(column)))
    return this
  }

  /**
   * Add group by clause as a raw query
   */
  public groupByRaw(sql: any, bindings?: any): this {
    this.hasGroupBy = true
    if (bindings) {
      this.knexQuery.groupByRaw(sql, bindings)
    } else {
      this.knexQuery.groupByRaw(this.transformRaw(sql))
    }

    return this
  }

  /**
   * Add order by clause
   */
  public orderBy(column: any, direction?: any): this {
    if (typeof column === 'string') {
      this.knexQuery.orderBy(this.resolveKey(column), direction)
      return this
    }

    /**
     * Here value can be one of the following
     * ['age', 'name']
     * [{ column: 'age', direction: 'desc' }]
     *
     * [{ column: Database.query().from('user_logins'), direction: 'desc' }]
     */
    if (Array.isArray(column)) {
      const transformedColumns = column.map((col) => {
        if (typeof col === 'string') {
          return { column: this.resolveKey(col) }
        }

        if (col.column) {
          col.column =
            typeof col.column === 'string'
              ? this.resolveKey(col.column)
              : this.transformValue(col.column)
          return col
        }

        return col
      })

      this.knexQuery.orderBy(transformedColumns)
      return this
    }

    this.knexQuery.orderBy(this.transformValue(column), direction)
    return this
  }

  /**
   * Add order by clause as a raw query
   */
  public orderByRaw(sql: any, bindings?: any): this {
    if (bindings) {
      this.knexQuery.orderByRaw(sql, bindings)
    } else {
      this.knexQuery.orderByRaw(this.transformRaw(sql))
    }

    return this
  }

  /**
   * Define select offset
   */
  public offset(value: number): this {
    this.knexQuery.offset(value)
    return this
  }

  /**
   * Define results limit
   */
  public limit(value: number): this {
    this.knexQuery.limit(value)
    return this
  }

  /**
   * Define union queries
   */
  public union(queries: any, wrap?: boolean): this {
    this.hasUnion = true

    queries = Array.isArray(queries)
      ? queries.map((one) => this.transformValue(one))
      : this.transformValue(queries)

    wrap !== undefined ? this.knexQuery.union(queries, wrap) : this.knexQuery.union(queries)
    return this
  }

  /**
   * Define union all queries
   */
  public unionAll(queries: any, wrap?: boolean): this {
    this.hasUnion = true

    queries = Array.isArray(queries)
      ? queries.map((one) => this.transformValue(one))
      : this.transformValue(queries)

    wrap !== undefined ? this.knexQuery.unionAll(queries, wrap) : this.knexQuery.unionAll(queries)
    return this
  }

  /**
   * Define intersect queries
   */
  public intersect(queries: any, wrap?: boolean): this {
    queries = Array.isArray(queries)
      ? queries.map((one) => this.transformValue(one))
      : this.transformValue(queries)

    wrap !== undefined ? this.knexQuery.intersect(queries, wrap) : this.knexQuery.intersect(queries)
    return this
  }

  /**
   * Clear select columns
   */
  public clearSelect(): this {
    this.knexQuery.clearSelect()
    return this
  }

  /**
   * Clear where clauses
   */
  public clearWhere(): this {
    this.whereStack = [[]]
    this.knexQuery.clearWhere()
    return this
  }

  /**
   * Clear order by
   */
  public clearOrder(): this {
    this.knexQuery.clearOrder()
    return this
  }

  /**
   * Clear having
   */
  public clearHaving(): this {
    this.knexQuery.clearHaving()
    return this
  }

  /**
   * Clear limit
   */
  public clearLimit(): this {
    this.knexQuery['_single'].limit = null
    return this
  }

  /**
   * Clear offset
   */
  public clearOffset(): this {
    this.knexQuery['_single'].offset = null
    return this
  }

  /**
   * Specify `FOR UPDATE` lock mode for a given
   * query
   */
  public forUpdate(...tableNames: string[]): this {
    this.knexQuery.forUpdate(...tableNames)

    return this
  }

  /**
   * Specify `FOR SHARE` lock mode for a given
   * query
   */
  public forShare(...tableNames: string[]): this {
    this.knexQuery.forShare(...tableNames)

    return this
  }

  /**
   * Skip locked rows
   */
  public skipLocked(): this {
    this.knexQuery.skipLocked()
    return this
  }

  /**
   * Fail when query wants a locked row
   */
  public noWait(): this {
    this.knexQuery.noWait()
    return this
  }

  /**
   * Define `with` CTE
   */
  public with(alias: any, query: any): this {
    this.knexQuery.with(alias, this.transformValue(query))
    return this
  }

  /**
   * Define `with` CTE with recursive keyword
   */
  public withRecursive(alias: any, query: any): this {
    this.knexQuery.withRecursive(alias, this.transformValue(query))
    return this
  }

  /**
   * Define schema for the table
   */
  public withSchema(schema: any): this {
    this.knexQuery.withSchema(schema)
    return this
  }

  /**
   * Define table alias
   */
  public as(alias: any): this {
    this.subQueryAlias = alias
    this.knexQuery.as(alias)
    return this
  }

  /**
   * Count rows for the current query
   */
  public count(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.count(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Count distinct rows for the current query
   */
  public countDistinct(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.countDistinct(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `min` aggregate function
   */
  public min(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.min(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `max` aggregate function
   */
  public max(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.max(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `avg` aggregate function
   */
  public avg(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.avg(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of distinct `avg` aggregate function
   */
  public avgDistinct(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.avgDistinct(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * Make use of `sum` aggregate function
   */
  public sum(columns: any, alias?: any): this {
    this.hasAggregates = true
    this.knexQuery.sum(this.normalizeAggregateColumns(columns, alias))
    return this
  }

  /**
   * A shorthand for applying offset and limit based upon
   * the current page
   */
  public forPage(page: number, perPage: number): this {
    /**
     * Calculate offset from current page and per page values
     */
    const offset = page === 1 ? 0 : perPage * (page - 1)
    this.offset(offset).limit(perPage)

    return this
  }

  /**
   * Define a query to constraint to be defined when condition is truthy
   */
  public if(
    condition: any,
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this {
    let matched: any = condition
    if (typeof condition === 'function') {
      matched = condition()
    }

    if (matched) {
      matchCallback(this)
    } else if (noMatchCallback) {
      noMatchCallback(this)
    }

    return this
  }

  /**
   * Define a query to constraint to be defined when condition is falsy
   */
  public unless(
    condition: any,
    matchCallback: (query: this) => any,
    noMatchCallback?: (query: this) => any
  ): this {
    let matched: any = condition
    if (typeof condition === 'function') {
      matched = condition()
    }

    if (!matched) {
      matchCallback(this)
    } else if (noMatchCallback) {
      noMatchCallback(this)
    }

    return this
  }

  /**
   * Define matching blocks just like `if/else if and else`.
   */
  public match(
    ...blocks: ([condition: any, callback: (query: this) => any] | ((query: this) => any))[]
  ): this {
    const matchingBlock = blocks.find((block) => {
      if (Array.isArray(block) && block.length === 2) {
        if (typeof block[0] === 'function' && block[0]()) {
          return true
        } else if (block[0]) {
          return true
        }
      }

      if (typeof block === 'function') {
        return true
      }
    })

    if (!matchingBlock) {
      return this
    }

    if (Array.isArray(matchingBlock)) {
      matchingBlock[1](this)
    } else {
      matchingBlock(this)
    }

    return this
  }
}

'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * Here we monkey patch/extend knex query builder
 * prototype.
 */

const _ = require('lodash')
const KnexQueryBuilder = require('knex/lib/query/builder')
const excludeAttrFromCount = ['order', 'columns', 'limit', 'offset']

const _from = KnexQueryBuilder.prototype.from

/**
 * Facade over `knex.from` method to entertain the `prefix`
 * value inside the file when selecting the table.
 *
 * @method from
 *
 * @for Database
 *
 * @param  {String} name
 *
 * @chainable
 */
KnexQueryBuilder.prototype.from = function (name) {
  const prefix = _.get(this.client, 'config.prefix')
  name = prefix && !this._ignorePrefix ? `${prefix}${name}` : name
  return _from.bind(this)(name)
}

/**
 * Alias for @ref('Database.from')
 *
 * @method table
 *
 * @for Database
 */
KnexQueryBuilder.prototype.table = function (...args) {
  return this.from(...args)
}

/**
 * Alias for @ref('Database.from')
 *
 * @method table
 *
 * @for Database
 */
KnexQueryBuilder.prototype.into = function (...args) {
  return this.from(...args)
}

/**
 * Instruct query builder to ignore prefix when
 * selecting table
 *
 * @method withOutPrefix
 *
 * @for Database
 *
 * @chainable
 */
KnexQueryBuilder.prototype.withOutPrefix = function () {
  this._ignorePrefix = true
  return this
}

/**
 * Add `offset` and `limit` based upon the current
 * and per page params.
 *
 * @method forPage
 *
 * @for Database
 *
 * @param  {Number} [page = 1]
 * @param  {Number} [perPage = 20]
 *
 * @chainable
 */
KnexQueryBuilder.prototype.forPage = function (page = 1, perPage = 20) {
  const offset = page === 1 ? 0 : perPage * (page - 1)
  return this.offset(offset).limit(perPage)
}

/**
 * Paginate results from database. This method is same as
 * @ref('Database.forPage') but instead returns pagination
 * meta data as well.
 *
 * @method paginate
 *
 * @for Database
 *
 * @param  {Number} page
 * @param  {Number} perPage
 *
 * @return {Object} @multiple([data=Array, page=Number, perPage=Number, total=Number, lastPage=Number])
 */
KnexQueryBuilder.prototype.paginate = async function (page = 2, perPage = 20) {
  const countByQuery = this.clone()

  /**
   * Remove statements that will make things bad with count
   * query, for example `orderBy`
   */
  countByQuery._statements = _.filter(countByQuery._statements, (statement) => {
    return excludeAttrFromCount.indexOf(statement.grouping) < 0
  })

  const counts = await countByQuery.count('* as total')
  const total = _.get(counts, '0.total', 0)
  const data = total === 0 ? [] : await this.forPage(page, perPage)

  return {
    total: total,
    perPage: perPage,
    page: page,
    lastPage: Math.ceil(total / perPage),
    data: data
  }
}

function generateAggregate (aggregateOp, defaultColumnName = undefined) {
  let funcName = 'get' + aggregateOp.charAt(0).toUpperCase() + aggregateOp.slice(1)
  KnexQueryBuilder.prototype[funcName] = async function (columnName = defaultColumnName) {
    if (!columnName) throw new Error(`'${funcName}' requires a column name.`)
    let wrapper = new this.constructor(this.client)
    wrapper.from(this.as('__lucid'))[aggregateOp](`${columnName} as __lucid_aggregate`)
    let results = await wrapper
    return results[0].__lucid_aggregate
  }
}

/**
 * Fetch and return a row count
 *
 * @method getCount
 * @async
 *
 * @param  {String}   columnName = '*'
 *
 * @return {Number} The count of get in this query
 */
generateAggregate('count', '*')

/**
 * Fetch and return the sum of all values in columnName
 *
 * @method getSum
 * @async
 *
 * @param  {String}   columnName
 *
 * @return {Number} The sum of columnName
 */
generateAggregate('sum')

/**
 * Fetch and return the minimum of all values in columnName
 *
 * @method getMin
 * @async
 *
 * @param  {String}   columnName
 *
 * @return {Number} The minimunm value of columnName
 */
generateAggregate('min')

/**
 * Fetch and return the maximum of all values in columnName
 *
 * @method getMax
 * @async
 *
 * @param  {String}   columnName
 *
 * @return {Number} The maximunm value of columnName
 */
generateAggregate('max')

/**
 * Fetch and return the average of all values in columnName
 *
 * @method getAvg
 * @async
 *
 * @param  {String}   columnName
 *
 * @return {Number} The average value of columnName
 */
generateAggregate('avg')

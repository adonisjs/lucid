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
var KnexQueryBuilder = require('knex/lib/query/builder')
const excludeAttrFromCount = ['order']

const _from = KnexQueryBuilder.prototype.from

KnexQueryBuilder.prototype.from = function (name) {
  const prefix = _.get(this.client, 'config.prefix')
  name = prefix && !this._ignorePrefix ? `${prefix}${name}` : name
  return _from.bind(this)(name)
}

KnexQueryBuilder.prototype.table = function (...args) {
  return this.from(...args)
}

KnexQueryBuilder.prototype.into = function (...args) {
  return this.from(...args)
}

KnexQueryBuilder.prototype.withOutPrefix = function () {
  this._ignorePrefix = true
  return this
}

KnexQueryBuilder.prototype.forPage = function (page, perPage = 20) {
  const offset = page === 1 ? 0 : perPage * (page - 1)
  return this.offset(offset).limit(perPage)
}

KnexQueryBuilder.prototype.paginate = async function (page, perPage = 20) {
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

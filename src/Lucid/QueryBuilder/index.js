'use strict'

/**
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Database = require('../../Database')
const proxyHandler = require('./proxyHandler')

/**
 * Query builder instance will be used for creating fluent queries.
 * It is database provider with couple of extra methods on top
 * of it.
 *
 * @class
 */
class QueryBuilder {
  constructor (HostModel) {
    this.HostModel = HostModel
    this.queryBuilder = Database.connection(this.HostModel.connection)
    this.modelQueryBuilder = this.queryBuilder(this.HostModel.table)
    this.avoidTrashed = false
    this.eagerLoad = {
      relations: [],
      nestedRelations: {},
      relationScopes: {},
      nestedScopes: {}
    }
    return new Proxy(this, proxyHandler)
  }
}

module.exports = QueryBuilder

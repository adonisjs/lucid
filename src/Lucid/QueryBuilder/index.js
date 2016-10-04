'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('harmony-reflect')
const Ioc = require('adonis-fold').Ioc
const EagerLoad = require('../Relations').EagerLoad
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
    const Database = Ioc.use('Adonis/Src/Database')
    this.HostModel = HostModel
    this.queryBuilder = Database.connection(this.HostModel.connection)
    this.modelQueryBuilder = null

    if (HostModel.prefix && !HostModel.skipPrefix) {
      this.modelQueryBuilder = this.queryBuilder.withPrefix(HostModel.prefix).table(this.HostModel.table)
    } else if (HostModel.skipPrefix) {
      this.modelQueryBuilder = this.queryBuilder.withoutPrefix().table(this.HostModel.table)
    } else {
      this.modelQueryBuilder = this.queryBuilder.table(this.HostModel.table)
    }

    this.avoidTrashed = false
    this.eagerLoad = new EagerLoad()
    return new Proxy(this, proxyHandler)
  }
}

module.exports = QueryBuilder

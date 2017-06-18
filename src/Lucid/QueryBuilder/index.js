'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')

const proxyHandler = {
  get (target, name) {
    if (target[name]) {
      return target[name]
    }
    return target.query[name]
  }
}

class QueryBuilder {
  constructor (model, connection) {
    this.model = model
    this.db = ioc.use('Adonis/Src/Database').connection(connection)
    const table = this.model.prefix ? `${this.model.prefix}${this.model.table}` : this.model.table
    this.query = this.db.table(table).on('query', this.model._executeListeners.bind(this.model))
    return new Proxy(this, proxyHandler)
  }

  async fetch () {
    const rows = await this.query
    const collection = rows.map((row) => {
      const modelInstance = new this.model()
      modelInstance.$persisted = true
      modelInstance.$attributes = row
      modelInstance._syncOriginals()
      modelInstance.castDates()
      return modelInstance
    })
    return new this.model.serializer(collection)
  }

  async update (values) {
    this.model.setUpdatedAt(values)
    return this.query.update(this.model.formatDates(values))
  }
}

module.exports = QueryBuilder

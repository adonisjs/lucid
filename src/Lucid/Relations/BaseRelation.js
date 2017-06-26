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
    /**
     * if value exists on the model instance, we return
     * it right away.
     */
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    /**
     * Here we called methods on the relationships
     * to decorate the query chain by chain required
     * methods.
     */
    if (target.__getters__.indexOf(name) > -1) {
      target._validateRead()
      target._decorateQuery()
    }

    return target.query[name]
  }
}

class BaseRelation {
  constructor (parentInstance, relatedModel, primaryKey, foreignKey) {
    this.parentInstance = parentInstance
    this.relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel
    this.primaryKey = primaryKey
    this.foreignKey = foreignKey
    this.query = this.relatedModel.query()

    /**
     * These methods are called directly on the
     * query builder after decorating the
     * query with required where clause.
     *
     * @type {Array}
     */
    this.__getters__ = [
      'increment',
      'decrement',
      'avg',
      'min',
      'max',
      'count',
      'truncate',
      'ids',
      'pair',
      'pluckFirst',
      'pluckId',
      'pick',
      'pickInverse',
      'update',
      'first'
    ]

    return new Proxy(this, proxyHandler)
  }
}

module.exports = BaseRelation

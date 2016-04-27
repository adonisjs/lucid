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
const proxyHandler = require('./proxyHandler')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')
const Ioc = require('adonis-fold').Ioc
const CE = require('../Model/customExceptions')

class Relation {

  constructor (parent, related) {
    this.parent = parent
    this.related = this._resolveModel(related)
    this.relatedQuery = this.related.query()
    return new Proxy(this, proxyHandler)
  }

  /**
   * returns the model from IoC container or returns
   * the actual binding if model representation is
   * not a string.
   *
   * @param  {String|Object}      model
   * @return {Object}
   *
   * @private
   */
  _resolveModel (model) {
    return typeof (model) === 'string' ? Ioc.use(model) : model
  }

  _validateRead () {
    if (this.parent.isNew()) {
      throw new CE.ModelRelationException('Cannot fetch related model from an unsaved model instance')
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to fetch relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
  }

  _decorateRead () {
    this.relatedQuery.where(this.toKey, this.parent[this.fromKey])
  }

  /**
   * returns the first match item for related model
   *
   * @return {Object}
   *
   * @public
   */
  first () {
    this._validateRead()
    this._decorateRead()
    return this.relatedQuery.first()
  }

  /**
   * calls the fetch method on the related query builder
   *
   * @return {Object}
   *
   * @public
   */
  fetch () {
    this._validateRead()
    this._decorateRead()
    return this.relatedQuery.fetch()
  }

  /**
   * calls the paginate method on the related query builder
   *
   * @return {Object}
   *
   * @public
   */
  paginate (page, perPage) {
    this._validateRead()
    this._decorateRead()
    return this.relatedQuery.paginate(page, perPage)
  }

  /**
   * adds with clause to related query, it almost becomes a recursive
   * loop until we get all nested relations
   *
   * @method addWith
   *
   * @param  {Array} keys
   *
   * @public
   */
  addWith (keys) {
    this.relatedQuery.with(keys)
  }

  /**
   * adds a scope to related query
   *
   * @method addScope
   *
   * @param  {String}   key
   * @param  {Function} callback
   *
   * @public
   */
  addScope (key, callback) {
    this.relatedQuery.scope(key, callback)
  }

  /**
   * saves a related model in reference to the parent model
   * and sets up foriegn key automatically.
   *
   * @param  {Object} relatedInstance
   * @return {Number}
   *
   * @public
   */
  * save (relatedInstance) {
    if (relatedInstance instanceof this.related === false) {
      throw new CE.ModelRelationSaveException('Save accepts an instance of related model')
    }
    if (this.parent.isNew()) {
      throw new CE.ModelRelationSaveException('Cannot save relation for an unsaved model instance')
    }
    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to save relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
    relatedInstance[this.toKey] = this.parent[this.fromKey]
    return yield relatedInstance.save()
  }

  /**
   * initiates related model by passing values and saving them
   * to the database
   *
   * @param  {Object} values
   * @return {Object}
   *
   * @public
   */
  * create (values) {
    const RelatedModel = this.related
    const relatedInstance = new RelatedModel(values)
    yield this.save(relatedInstance)
    return relatedInstance
  }

}

module.exports = Relation

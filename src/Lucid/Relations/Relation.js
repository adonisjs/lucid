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
const cf = require('co-functional')
const Ioc = require('adonis-fold').Ioc
const CE = require('../../Exceptions')

class Relation {

  constructor (parent, related) {
    this.parent = parent
    this.related = this._resolveModel(related)
    this.relatedQuery = this.related.query()
    return new Proxy(this, proxyHandler)
  }

  /**
   * empty placeholder to be used when unable to eagerload
   * relations. It needs to be an array of many to many
   * relationships.
   *
   * @method eagerLoadFallbackValue
   *
   * @return {Array}
   */
  get eagerLoadFallbackValue () {
    return []
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

  /**
   * validates the data on instance to make sure
   * read is possible
   */
  _validateRead () {
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('fetch', this.parent.constructor.name, this.related.name)
    }

    if (!this.parent[this.fromKey]) {
      logger.warn(`Trying to fetch relationship with ${this.fromKey} as primaryKey, whose value is falsy`)
    }
  }

  /**
   * decorates the current query chain before execution
   */
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
   * @return {Array}
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
      throw CE.ModelRelationException.relationMisMatch('save accepts an instance of related model')
    }
    if (this.parent.isNew()) {
      throw CE.ModelRelationException.unSavedTarget('save', this.parent.constructor.name, this.related.name)
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

  /**
   * create many related instances
   *
   * @method createMany
   *
   * @param  {Array}   arrayOfValues an array of saved instance
   *
   * @return {Array}
   */
  * createMany (arrayOfValues) {
    const self = this
    return cf.map(function * (values) {
      return yield self.create(values)
    }, arrayOfValues)
  }

  /**
   * saved many related instances
   *
   * @method saveMany
   *
   * @param  {Array}   arrayOfValues an array of booleans
   *
   * @return {Array}
   */
  * saveMany (arrayOfInstances) {
    const self = this
    return cf.map(function * (relatedInstance) {
      return yield self.save(relatedInstance)
    }, arrayOfInstances)
  }

}

module.exports = Relation

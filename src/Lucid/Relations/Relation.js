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
const _ = require('lodash')
const Ioc = require('adonis-fold').Ioc
const CE = require('../../Exceptions')

const morphMap = {}

class Relation {
  constructor (parent, related) {
    this.parent = parent
    this.related = related ? this._resolveModel(related) : null
    this.relatedQuery = related ? this.related.query() : null
    return new Proxy(this, proxyHandler)
  }

  /**
   * Set or get the morph map for polymorphic relations.
   *
   * @param  {Object|Array}  map
   * @param  {Boolean}       merge
   *
   * @return {Object}
   */
  static morphMap (map = {}, merge = true) {
    if (merge) {
      if (Array.isArray(map)) {
        map = _.reduce(map, (result, model) => {
          result[model.table] = model
          return result
        }, {})
      }
      _.assignIn(morphMap, map)
    }
    return morphMap
  }

  /**
   * Get the morph key for polymorphic relations.
   *
   * @param  {Object}  model
   *
   * @return {String|null}
   */
  static morphKey (model) {
    return _.findKey(morphMap, (value) => {
      return model.constructor.table === value.table
    })
  }

  /**
   * Get the morph model for polymorphic relations.
   *
   * @param  {String}  key
   *
   * @return {Object|null}
   */
  static morphModel (key) {
    return _.get(morphMap, key)
  }

  /**
   * Returns related query after validating that
   * read is possible + decorating the query
   * by adding required where statement(s)
   *
   * @attribute relationQuery
   *
   * @return {Object}
   */
  get relationQuery () {
    this._validateRead()
    this._decorateRead()
    return this.relatedQuery
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
   * Removes the related record for the given relationship
   *
   * @return {Object}
   */
  delete () {
    this._validateRead()
    this._decorateRead()
    return this.relatedQuery.delete()
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
   * Returns the existence query to be used when main
   * query is dependent upon childs.
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  exists (callback) {
    const relatedQuery = this.relatedQuery.whereRaw(`${this.related.table}.${this.toKey} = ${this.parent.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(relatedQuery)
    }
    return relatedQuery.modelQueryBuilder
  }

  /**
   * Returns the counts query for a given relation
   *
   * @param  {Function} [callback]
   * @return {Object}
   */
  counts (callback) {
    const relatedQuery = this.relatedQuery.count('*').whereRaw(`${this.related.table}.${this.toKey} = ${this.parent.constructor.table}.${this.fromKey}`)
    if (typeof (callback) === 'function') {
      callback(relatedQuery)
    }
    return relatedQuery.modelQueryBuilder
  }

  /**
   * Returns the query builder instance for related model.
   *
   * @return {Object}
   */
  getRelatedQuery () {
    return this.relatedQuery
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
   * Update value on the related model instance
   *
   * @param  {Object} values
   * @return {Object}
   *
   * @public
   */
  * update (values) {
    this._validateRead()
    this._decorateRead()
    return yield this.relatedQuery.update(values)
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

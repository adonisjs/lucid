'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const moment = require('moment')

const Hooks = require('../Hooks')
const QueryBuilder = require('../QueryBuilder')
const CollectionSerializer = require('../Serializers/Collection')
const CE = require('../../Exceptions')

const util = require('../../../lib/util')

/**
 * Lucid model is a base model and supposed to be
 * extended by other models.
 *
 * @class Model
 */
class Model {
  constructor () {
    this._instantiate()
    return new Proxy(this, require('./proxyHandler'))
  }

  /**
   * Boot model if not booted. This method is supposed
   * to be executed via IoC container hooks.
   *
   * @method _bootIfNotBooted
   *
   * @return {void}
   *
   * @private
   *
   * @static
   */
  static _bootIfNotBooted () {
    if (!this.$booted) {
      this.boot()
    }
  }

  /**
   * An array of methods to be called everytime
   * a model in imported via boot method
   *
   * @attribute iocHooks
   *
   * @return {Array}
   *
   * @static
   */
  static get iocHooks () {
    return ['_bootIfNotBooted']
  }

  /**
   * The primary key for the model. You can change it
   * to anything you want.
   *
   * @attribute primaryKey
   *
   * @return {String}
   *
   * @static
   */
  static get primaryKey () {
    return 'id'
  }

  /**
   * Tell lucid whether primary key is supposed to be
   * incrementing or not. If `false` is returned then
   * users is responsible for setting the `primaryKey`.
   *
   * @attribute incrementing
   *
   * @return {Boolean}
   *
   * @static
   */
  static get incrementing () {
    return true
  }

  /**
   * Returns the value of primary key regardless of
   * the key name
   *
   * @method primaryKeyValue
   *
   * @return {Mixed}
   */
  get primaryKeyValue () {
    return this.$attributes[this.constructor.primaryKey]
  }

  /**
   * Override primary key value.
   *
   * Note: You should know what you are doing, since primary
   * keys are supposed to be fetched automatically from
   * the database table.
   *
   * The only time you want to do is when `incrementing` is
   * set to false
   *
   * @method primaryKeyValue
   *
   * @param  {Mixed}        value
   *
   * @return {void}
   */
  set primaryKeyValue (value) {
    this.$attributes[this.constructor.primaryKey] = value
  }

  /**
   * The database connection to be used for
   * the model.
   *
   * @attribute connection
   *
   * @return {String}
   *
   * @static
   */
  static get connection () {
    return ''
  }

  /**
   * The date format to be used for formatting
   * `dates`.
   *
   * @attribute dateFormat
   *
   * @return {String}
   *
   * @static
   */
  static get dateFormat () {
    return 'YYYY-MM-DD HH:mm:ss'
  }

  /**
   * The attributes to be considered as dates. By default
   * `createdAtColumn` and `updatedAtColumn` are
   * considered as dates.
   *
   * @attribute dates
   *
   * @return {Array}
   *
   * @static
   */
  static get dates () {
    const dates = []
    if (this.createdAtColumn) { dates.push(this.createdAtColumn) }
    if (this.updatedAtColumn) { dates.push(this.updatedAtColumn) }
    return dates
  }

  /**
   * The attribute name for created at timestamp
   *
   * @attribute createdAtColumn
   *
   * @return {String}
   *
   * @static
   */
  static get createdAtColumn () {
    return 'created_at'
  }

  /**
   * The attribute name for updated at timestamp
   *
   * @attribute updatedAtColumn
   *
   * @return {String}
   *
   * @static
   */
  static get updatedAtColumn () {
    return 'updated_at'
  }

  /**
   * The table name for the model
   *
   * @method table
   *
   * @return {String}
   *
   * @static
   */
  static get table () {
    return util.makeTableName(this.name)
  }

  /**
   * The serializer to be used for serializing
   * data. The return value must always be a
   * ES6 class.
   *
   * @method serializer
   *
   * @return {Class}
   */
  static get serializer () {
    return CollectionSerializer
  }

  /**
   * Executes the query listeners attached on the
   * model
   *
   * @method _executeListeners
   *
   * @param  {Object}          query
   *
   * @return {void}
   *
   * @static
   *
   * @private
   */
  static _executeListeners (query) {
    _(this.$queryListeners)
    .filter((listener) => typeof (listener) === 'function')
    .each((listener) => listener(query))
  }

  /**
   * Get fresh instance of query builder for
   * this model
   *
   * @method query
   *
   * @return {QueryBuilder}
   *
   * @static
   */
  static query () {
    return new QueryBuilder(this, this.connection)
  }

  /**
   * Method to be called only once to boot
   * the model
   *
   * @method boot
   *
   * @return {void}
   *
   * @static
   */
  static boot () {
    this.hydrate()
    this.$booted = true
  }

  /**
   * Hydrates model static properties by re-setting
   * them to their original value.
   *
   * @method hydrate
   *
   * @return {void}
   *
   * @static
   */
  static hydrate () {
    /**
     * Whether or not model has been booted
     *
     * @type {Boolean}
     */
    Model.$booted = false

    /**
     * Model hooks for different lifecycle
     * events
     *
     * @type {Object}
     */
    Model.$hooks = {
      before: new Hooks(),
      after: new Hooks()
    }

    /**
     * List of global query listeners for the model.
     *
     * @type {Array}
     */
    Model.$queryListeners = []
  }

  /**
   * Adds a new hook for a given event type.
   *
   * @method addHook
   *
   * @param  {String} forEvent
   * @param  {Function|String} handler
   *
   * @return {void}
   *
   * @static
   */
  static addHook (forEvent, handler) {
    const [cycle, event] = util.getCycleAndEvent(forEvent)

    /**
     * If user has defined wrong hook cycle, do let them know
     */
    if (!this.$hooks[cycle]) {
      throw CE.InvalidArgumentException.invalidParamter(`Invalid hook event {${forEvent}}`)
    }

    /**
     * Add the handler
     */
    this.$hooks[cycle].addHandler(event, handler)
  }

  /**
   * Attach a listener to be called everytime a query on
   * the model is executed
   *
   * @method onQuery
   *
   * @param  {Function} callback
   *
   * @chainable
   */
  static onQuery (callback) {
    this.$queryListeners.push(callback)
    return this
  }

  /**
   * Formats all the dates set as `dates` on the model
   * and exists in the values object.
   *
   * Note: This method will not mutate the original object
   * and instead returns a new one.
   *
   * @method formatDates
   *
   * @param  {Object}    values
   *
   * @return {Object}
   */
  static formatDates (values) {
    /**
     * Format dates properly when saving them to database
     */
    return _.transform(values, (result, value, key) => {
      if (this.dates.indexOf(key) > -1) {
        result[key] = moment(value).format(this.dateFormat)
      } else {
        result[key] = value
      }
      return result
    }, {})
  }

  /**
   * Sets `created_at` column on the values object.
   *
   * Note: This method will mutate the original object
   * by adding a new key/value pair.
   *
   * @method setCreatedAt
   *
   * @param  {Object}     values
   */
  static setCreatedAt (values) {
    if (this.createdAtColumn) {
      values[this.createdAtColumn] = new Date()
    }
  }

  /**
   * Sets `updated_at` column on the values object.
   *
   * Note: This method will mutate the original object
   * by adding a new key/value pair.
   *
   * @method setUpdatedAt
   *
   * @param  {Object}     values
   *
   * @static
   */
  static setUpdatedAt (values) {
    if (this.updatedAtColumn) {
      values[this.updatedAtColumn] = new Date()
    }
  }

  /**
   * Tells whether model instance is new or
   * persisted to database.
   *
   * @attribute isNew
   *
   * @return {Boolean}
   */
  get isNew () {
    return !this.$persisted
  }

  /**
   * Returns an object of values dirty after persisting to
   * database or after fetching from database.
   *
   * @attribute dirty
   *
   * @return {Object}
   */
  get dirty () {
    return _.pickBy(this.$attributes, (value, key) => {
      return _.isUndefined(this.$originalAttributes[key]) || this.$originalAttributes[key] !== value
    })
  }

  /**
   * Tells whether model is dirty or not
   *
   * @attribute isDirty
   *
   * @return {Boolean}
   */
  get isDirty () {
    return _.size(this.dirty)
  }

  /**
   * Instantiate the model by defining constructor properties
   * and also setting `__setters__` to tell the proxy that
   * these values should be set directly on the constructor
   * and not on the `attributes` object.
   *
   * @method instantiate
   *
   * @return {void}
   *
   * @private
   */
  _instantiate () {
    this.__setters__ = ['$attributes', '$persisted', 'primaryKeyValue', '$originalAttributes']
    this.$attributes = {}
    this.$originalAttributes = {}
    this.$persisted = false
  }

  /**
   * Sync the original attributes with actual attributes.
   * This is done after `save`, `update` and `find`.
   *
   * After this `isDirty` should return `false`.
   *
   * @method _syncOriginals
   *
   * @return {void}
   *
   * @private
   */
  _syncOriginals () {
    this.$originalAttributes = _.clone(this.$attributes)
  }

  /**
   * Insert values to the database. This method will
   * call before and after hooks for `create` and
   * `save` event.
   *
   * @method _insert
   *
   * @return {void}
   *
   * @private
   */
  async _insert () {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('create', this)

    /**
     * Set timestamps
     */
    this.constructor.setCreatedAt(this.$attributes)
    this.constructor.setUpdatedAt(this.$attributes)

    const result = await this.constructor
      .query()
      .returning(this.constructor.$primaryKey)
      .insert(this.constructor.formatDates(this.$attributes))

    /**
     * Only set the primary key value when incrementing is
     * set to true on model
     */
    if (this.constructor.incrementing) {
      this.primaryKeyValue = result[0]
    }

    this.$persisted = true

    /**
     * Keep a clone copy of saved attributes, so that we can find
     * a diff later when calling the update query.
     */
    this._syncOriginals()

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('create', this)
  }

  /**
   * Update model by updating dirty attributes to the database.
   *
   * @method _update
   *
   * @return {void}
   */
  async _update () {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('update', this)

    if (this.isDirty) {
      /**
       * Set proper timestamps
       */
      const result = await this.constructor.query().update(this.dirty)
      /**
       * Sync originals to find a diff when updating for next time
       */
      this._syncOriginals()
    }

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('update', this)
  }

  /**
   * Set attributes on model instance in bulk. Calling
   * fill will remove the existing attributes.
   *
   * @method fill
   *
   * @param  {Object} attributes
   *
   * @return {void}
   */
  fill (attributes) {
    this.$attributes = {}
    _.each(attributes, (value, key) => this.set(key, value))
  }

  /**
   * Set attribute on model instance. Setting properties
   * manually or calling the `set` function has no
   * difference.
   *
   * Note this method will call the setter
   *
   * @method set
   *
   * @param  {String} name
   * @param  {Mixed} value
   *
   * @return {void}
   */
  set (name, value) {
    const setterName = util.getSetterName(name)
    if (typeof (this[setterName]) === 'function') {
      value = this[setterName](value)
    }
    return this.$attributes[name] = value
  }

  /**
   * Converts all date fields inside moment objects, so
   * that you can transform them into something else.
   *
   * @method castDates
   *
   * @return {void}
   */
  castDates () {
    this.constructor.dates.forEach((field) => {
      const value = this.$attributes[field]
      if (value) {
        this.$attributes[field] = moment(value)
      }
    })
  }

  /**
   * Converts model to JSON. This method will call getters
   * defined on the model and will attach `computed`
   * properties to the JSON.
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    let evaluatedAttrs = _.transform(this.$attributes, (result, value, key) => {
      const getter = this[util.getGetterName(key)]
      result[key] = typeof (getter) === 'function' ? getter(value) : value
      return result
    }, {})

    /**
     * Set computed properties when defined
     */
    _.each(this.constructor.computed || [], (key) => {
      const getter = this[util.getGetterName(key)]
      if (typeof (getter) === 'function') {
        evaluatedAttrs[key] = getter(evaluatedAttrs)
      }
    })

    /**
     * Pick visible fields or remove hidden fields
     */
    if (_.isArray(this.constructor.visible)) {
      evaluatedAttrs = _.pick(evaluatedAttrs, this.constructor.visible)
    } else if (_.isArray(this.constructor.hidden)) {
      evaluatedAttrs = _.omit(evaluatedAttrs, this.constructor.hidden)
    }

    return evaluatedAttrs
  }

  /**
   * Persist model to the database. It will create a new row
   * when model has not been persisted already, otherwise
   * will update it.
   *
   * @method save
   *
   * @return {void}
   */
  async save () {
    return this.isNew ? await this._insert() : await this._update()
  }
}

Model.hydrate()
module.exports = Model

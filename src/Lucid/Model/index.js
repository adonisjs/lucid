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
const HasOne = require('../Relations/HasOne')
const HasMany = require('../Relations/HasMany')
const BelongsTo = require('../Relations/BelongsTo')
const EagerLoad = require('../EagerLoad')

const CE = require('../../Exceptions')
const util = require('../../../lib/util')
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'

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
      this.$booted = true
      this.boot()
    }
  }

  /**
   * An array of methods to be called everytime
   * a model is imported via ioc container.
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
   * @return {String} The default value is `id`
   *
   * @static
   */
  static get primaryKey () {
    return 'id'
  }

  /**
   * The foreign key for the model. It is generated
   * by converting model name to lowercase and then
   * snake case and appending `_id` to it.
   *
   * @attribute foreignKey
   *
   * @return {String}
   *
   * @example
   * ```
   * User - user_id
   * Post - posts_id
   * ``
   */
  static get foreignKey () {
    return util.makeForeignKey(this.name)
  }

  /**
   * Tell Lucid whether primary key is supposed to be incrementing
   * or not. If `false` is returned then you are responsible for
   * setting the `primaryKeyValue` for the model instance.
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
   * the key name.
   *
   * @attribute primaryKeyValue
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
   * @attribute primaryKeyValue
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
   * the model. Returning blank string will
   * use the `default` connection.
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
   * The attributes to be considered as dates. By default
   * @ref('Model.createdAtColumn') and @ref('Model.updatedAtColumn')
   * are considered as dates.
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
   * The attribute name for created at timestamp.
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
   * The attribute name for updated at timestamp.
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
   * The table name for the model. It is dynamically generated
   * from the Model by name by pluralizing it and converting
   * it to lowercase.
   *
   * @attribute table
   *
   * @return {String}
   *
   * @static
   *
   * @example
   * ```
   * Model - User
   * table - users
   *
   * Model - Person
   * table - people
   * ```
   */
  static get table () {
    return util.makeTableName(this.name)
  }

  /**
   * The serializer to be used for serializing
   * data. The return value must always be a
   * ES6 class.
   *
   * By default Lucid uses @ref('BaseSerializer')
   *
   * @attribute serializer
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
   * this model.
   *
   * @method query
   *
   * @return {LucidQueryBuilder}
   *
   * @static
   */
  static query () {
    return new QueryBuilder(this, this.connection)
  }

  /**
   * Method to be called only once to boot
   * the model.
   *
   * @method boot
   *
   * @return {void}
   *
   * @static
   */
  static boot () {
    this.hydrate()
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
     * Model hooks for different lifecycle
     * events
     *
     * @type {Object}
     */
    this.$hooks = {
      before: new Hooks(),
      after: new Hooks()
    }

    /**
     * List of global query listeners for the model.
     *
     * @type {Array}
     */
    this.$queryListeners = []

    /**
     * List of global query scopes. Chained before executing
     * query builder queries.
     */
    this.$globalScopes = []
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
   * Adds the global scope to the model global scopes.
   * A named global scope can be removed later
   *
   * @method addGlobalScope
   *
   * @param  {Function}     callback
   * @param  {String}       [name = null]
   */
  static addGlobalScope (callback, name = null) {
    this.$globalScopes.push({ callback, name })
    return this
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
   * This method is executed for all the date fields
   * with the field name and the value. The return
   * value gets saved to the database.
   *
   * Also if you have defined a setter for a date field
   * this method will not be executed for that field.
   *
   * @method formatDates
   *
   * @param  {String}    key
   * @param  {String|Date}    value
   *
   * @return {String}
   */
  static formatDates (key, value) {
    return moment(value).format(DATE_FORMAT)
  }

  /**
   * This method is executed when toJSON is called on a
   * model or collection of models. The value received
   * will always be an instance of momentjs and return
   * value is used.
   *
   * NOTE: This method will not be executed when you define
   * a getter for a given field.
   *
   * @method castDates
   *
   * @param  {String}  key
   * @param  {Moment}  value
   *
   * @return {String}
   *
   * @static
   */
  static castDates (key, value) {
    return value.format(DATE_FORMAT)
  }

  /**
   * Formats the date fields from the payload, only
   * when they are marked as dates and there are
   * not setters for them.
   *
   * Note: This method will mutate the existing object. If
   * any part of your application doesn't want mutations
   * then pass a cloned copy of object
   *
   * @method _formatDateFields
   *
   * @param  {Object}          values
   *
   * @return {Object}
   *
   * @private
   */
  _formatDateFields (values) {
    _(this.constructor.dates)
    .filter((date) => {
      return values[date] && typeof(this[util.getSetterName(date)]) !== 'function'
    })
    .each((date) => { values[date] = this.constructor.formatDates(date, values[date]) })
  }

  /**
   * Sets `created_at` column on the values object.
   *
   * Note: This method will mutate the original object
   * by adding a new key/value pair.
   *
   * @method _setCreatedAt
   *
   * @param  {Object}     values
   *
   * @private
   */
  _setCreatedAt (values) {
    const createdAtColumn = this.constructor.createdAtColumn
    if (createdAtColumn) {
      values[createdAtColumn] = this._getSetterValue(createdAtColumn, new Date())
    }
  }

  /**
   * Checks for existence of setter on model and if exists
   * returns the return value of setter, otherwise returns
   * the default value
   *
   * @method _getSetterValue
   *
   * @param  {String}        key
   * @param  {Mixed}        value
   *
   * @return {Mixed}
   *
   * @private
   */
  _getSetterValue (key, value) {
    const setterName = util.getSetterName(key)
    return typeof (this[setterName]) === 'function' ? this[setterName](value) : value
  }

  /**
   * Checks for existence of getter on model and if exists
   * returns the return value of getter, otherwise returns
   * the default value
   *
   * @method _getGetterValue
   *
   * @param  {String}        key
   * @param  {Mixed}         value
   * @param  {Mixed}         [passAttrs = null]
   *
   * @return {Mixed}
   *
   * @private
   */
  _getGetterValue (key, value, passAttrs = null) {
    const getterName = util.getGetterName(key)
    return typeof (this[getterName]) === 'function' ? this[getterName](passAttrs ? passAttrs : value) : value
  }

  /**
   * Sets `updated_at` column on the values object.
   *
   * Note: This method will mutate the original object
   * by adding a new key/value pair.
   *
   * @method _setUpdatedAt
   *
   * @param  {Object}     values
   *
   * @private
   */
  _setUpdatedAt (values) {
    const updatedAtColumn = this.constructor.updatedAtColumn
    if (updatedAtColumn) {
      values[updatedAtColumn] = this._getSetterValue(updatedAtColumn, new Date())
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
    return !!_.size(this.dirty)
  }

  /**
   * Returns a boolean indicating if model is
   * child of a parent model
   *
   * @attribute hasParent
   *
   * @return {Boolean}
   */
  get hasParent () {
    return !!this.$parent
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
    this.__setters__ = [
      '$attributes',
      '$persisted',
      'primaryKeyValue',
      '$originalAttributes',
      '$relations',
      '$sideLoaded',
      '$parent'
    ]

    this.$attributes = {}
    this.$persisted = false
    this.$originalAttributes = {}
    this.$relations = {}
    this.$sideLoaded = {}
    this.$parent = null
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
    this._setCreatedAt(this.$attributes)
    this._setUpdatedAt(this.$attributes)
    this._formatDateFields(this.$attributes)

    const result = await this.constructor
      .query()
      .returning(this.constructor.primaryKey)
      .insert(this.$attributes)

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
   * Converts all date fields to moment objects, so
   * that you can transform them into something
   * else.
   *
   * @method _convertDatesToMomentInstances
   *
   * @return {void}
   *
   * @private
   */
  _convertDatesToMomentInstances () {
    this.constructor.dates.forEach((field) => {
      const value = this.$attributes[field]
      if (value) {
        this.$attributes[field] = moment(value)
      }
    })
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
    return this.$attributes[name] = this._getSetterValue(name, value)
  }

  /**
   * Converts model to JSON. This method will call getters
   * defined on the model and will attach `computed`
   * properties to the JSON.
   *
   * @method toObject
   *
   * @return {Object}
   */
  toObject () {
    let evaluatedAttrs = _.transform(this.$attributes, (result, value, key) => {
      if (value instanceof moment && typeof (this[util.getGetterName(key)]) !== 'function') {
        result[key] = this.constructor.castDates(key, value)
      } else {
        result[key] =  this._getGetterValue(key, value)
      }
      return result
    }, {})

    /**
     * Set computed properties when defined
     */
    _.each(this.constructor.computed || [], (key) => {
      evaluatedAttrs[key] = this._getGetterValue(key, null, evaluatedAttrs)
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
   * Converts model instance toJSON using the serailizer
   * toJSON method
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    return new this.constructor.serializer(this, null, true).toJSON()
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

  /**
   * Perform required actions to newUp the model instance. This
   * method does not call setters since it is supposed to be
   * called after `fetch` or `find`.
   *
   * @method newUp
   *
   * @param  {Object} row
   *
   * @return {void}
   */
  newUp (row) {
    this.$persisted = true
    this.$attributes = row
    this._convertDatesToMomentInstances()
    this._syncOriginals()
  }

  /**
   * Find a row using the primary key
   *
   * @method find
   *
   * @param  {String|Number} value
   *
   * @return {Model|Null}
   */
  static find (value) {
    return this.findBy(this.primaryKey, value)
  }

  /**
   * Find a model instance using key/value pair
   *
   * @method findBy
   *
   * @param  {String} key
   * @param  {Mixed} value
   *
   * @return {Model|Null}
   */
  static findBy (key, value) {
    return this.query().where(key, value).first()
  }

  /**
   * Returns the first row. This method will add orderBy asc
   * clause
   *
   * @method first
   *
   * @return {Model|Null}
   */
  static first () {
    return this.query().orderBy(this.primaryKey, 'asc').first()
  }

  /**
   * Fetch everything from the database
   *
   * @method all
   *
   * @return {Collection}
   */
  static all () {
    return this.query().fetch()
  }

  /**
   * Select x number of rows
   *
   * @method pick
   *
   * @param  {Number} [limit = 1]
   *
   * @return {Collection}
   */
  static pick (limit = 1) {
    return this.query().pick(limit)
  }

  /**
   * Select x number of rows in inverse
   *
   * @method pickInverse
   *
   * @param  {Number}    [limit = 1]
   *
   * @return {Collection}
   */
  static pickInverse (limit = 1) {
    return this.query().pickInverse(limit)
  }

  /**
   * Returns an array of ids.
   *
   * Note: this method doesn't allow eagerloading relations
   *
   * @method ids
   *
   * @return {Array}
   */
  static ids () {
    return this.query().ids()
  }

  /**
   * Returns an array of ids.
   *
   * Note: this method doesn't allow eagerloading relations
   *
   * @method ids
   *
   * @return {Array}
   */
  static pair (lhs, rhs) {
    return this.query().pair(lhs, rhs)
  }

  /**
   * Sets a preloaded relationship on the model instance
   *
   * @method setRelated
   *
   * @param  {String}   key
   * @param  {Object|Array}   value
   *
   * @throws {RuntimeException} If trying to set a relationship twice.
   */
  setRelated (key, value) {
    if (this.$relations[key]) {
      throw CE.RuntimeException.overRidingRelation(key)
    }

    this.$relations[key] = value

    /**
     * Don't do anything when value doesn't exists
     */
    if (!value) {
      return
    }

    /**
     * Set parent on model instance if value is instance
     * of model.
     */
    if (value instanceof Model) {
      value.$parent = this.constructor.name
      return
    }

    /**
     * Otherwise loop over collection rows to set
     * the $parent.
     */
    _(value.rows)
    .filter((val) => !!val)
    .each((val) => val.$parent = this.constructor.name)
  }

  /**
   * Returns the relationship value
   *
   * @method getRelated
   *
   * @param  {String}   key
   *
   * @return {Object}
   */
  getRelated (key) {
    return this.$relations[key]
  }

  /**
   * Loads relationships and set them as $relations
   * attribute.
   *
   * To load multiple relations, call this method for
   * multiple times
   *
   * @method load
   *
   * @param  {String}   relation
   * @param  {Function} callback
   *
   * @return {void}
   */
  async load (relation, callback) {
    const eagerLoad = new EagerLoad({ [relation]: callback })
    const result = await eagerLoad.loadForOne(this)
    _.each(result, (values, name) => this.setRelated(name, values))
  }

  /**
   * Just like load but instead loads multiple relations for a
   * single model instance
   *
   * @method loadMany
   *
   * @param  {Object} eagerLoadMap
   *
   * @return {void}
   */
  async loadMany (eagerLoadMap) {
    const eagerLoad = new EagerLoad(eagerLoadMap)
    const result = await eagerLoad.loadForOne(this)
    _.each(result, (values, name) => this.setRelated(name, values))
  }

  /**
   * Returns an instance of @ref('HasOne') relation.
   *
   * @method hasOne
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}        primaryKey
   * @param  {String}        foreignKey
   *
   * @return {HasOne}
   */
  hasOne (relatedModel, primaryKey = this.constructor.primaryKey, foreignKey = this.constructor.foreignKey) {
    return new HasOne(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('HasMany') relation
   *
   * @method hasMany
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}        primaryKey
   * @param  {String}        foreignKey
   *
   * @return {HasMany}
   */
  hasMany (relatedModel, primaryKey = this.constructor.primaryKey, foreignKey = this.constructor.foreignKey) {
    return new HasMany(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('BelongsTo') relation
   *
   * @method belongsTo
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}  primaryKey
   * @param  {String}  foreignKey
   *
   * @return {belongsTo}
   */
  belongsTo (relatedModel, primaryKey = relatedModel.foreignKey, foreignKey = relatedModel.primaryKey) {
    return new BelongsTo(this, relatedModel, primaryKey, foreignKey)
  }
}

module.exports = Model

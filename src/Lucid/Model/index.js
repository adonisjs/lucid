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
const GE = require('@adonisjs/generic-exceptions')
const { resolver, ioc } = require('../../../lib/iocResolver')

const BaseModel = require('./Base')
const QueryBuilder = require('../QueryBuilder')
const EagerLoad = require('../EagerLoad')

const { HasOne, HasMany, BelongsTo, BelongsToMany, HasManyThrough } = require('../Relations')

const CE = require('../../Exceptions')
const util = require('../../../lib/util')

/**
 * Lucid model is a base model and supposed to be
 * extended by other models.
 *
 * @binding Adonis/Src/Model
 * @alias Model
 * @group Database
 *
 * @class Model
 */
class Model extends BaseModel {
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
   * Making sure that `ioc.make` returns
   * the class object and not it's
   * instance
   *
   * @method makePlain
   *
   * @return {Boolean}
   */
  static get makePlain () {
    return true
  }

  /**
   * The primary key for the model. You can change it
   * to anything you want, just make sure that the
   * value of this key will always be unique.
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
   * Post - post_id
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
   * The table name for the model. It is dynamically generated
   * from the Model name by pluralizing it and converting it
   * to lowercase.
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
    const query = new (this.QueryBuilder || QueryBuilder)(this, this.connection)

    /**
     * Listening for query event and executing
     * listeners if any
     */
    query.on('query', (builder) => {
      _(this.$queryListeners)
        .filter((listener) => typeof (listener) === 'function')
        .each((listener) => listener(builder))
    })

    return query
  }

  /**
   * Returns a query builder without any global scopes
   *
   * @method queryWithOutScopes
   *
   * @return {QueryBuilder}
   */
  static queryWithOutScopes () {
    return this.query().ignoreScopes()
  }

  /**
   * Define a query macro to be added to query builder.
   *
   * @method queryMacro
   *
   * @param  {String}   name
   * @param  {Function} fn
   *
   * @chainable
   */
  static queryMacro (name, fn) {
    /**
     * Someone wished to add methods to query builder but just for
     * this model. First get a unique copy of query builder and
     * then add methods to it's prototype.
     */
    if (!this.QueryBuilder) {
      this.QueryBuilder = class ExtendedQueryBuilder extends QueryBuilder {}
    }

    this.QueryBuilder.prototype[name] = fn
    return this
  }

  /**
   * Adds a new hook for a given event type.
   *
   * @method addHook
   *
   * @param  {String} forEvent
   * @param  {Function|String|Array} handlers
   *
   * @chainable
   *
   * @static
   */
  static addHook (forEvent, handlers) {
    const [cycle, event] = util.getCycleAndEvent(forEvent)

    /**
     * If user has defined wrong hook cycle, do let them know
     */
    if (!this.$hooks[cycle]) {
      throw GE.InvalidArgumentException.invalidParameter(`Invalid hook event {${forEvent}}`)
    }

    /**
     * Add the handler
     */
    handlers = Array.isArray(handlers) ? handlers : [handlers]
    handlers.forEach((handler) => {
      this.$hooks[cycle].addHandler(event, handler)
    })
    return this
  }

  /**
   * Adds the global scope to the model global scopes.
   *
   * You can also give name to the scope, since named
   * scopes can be removed when executing queries.
   *
   * @method addGlobalScope
   *
   * @param  {Function}     callback
   * @param  {String}       [name = null]
   *
   * @chainable
   */
  static addGlobalScope (callback, name) {
    this.$globalScopes.add(callback, name)
    return this
  }

  /**
   * Attach a listener to be called everytime a query on
   * the model is executed.
   *
   * @method onQuery
   *
   * @param  {Function} callback
   *
   * @chainable
   */
  static onQuery (callback) {
    if (typeof (callback) !== 'function') {
      throw GE
        .InvalidArgumentException
        .invalidParameter('Model.onQuery expects a closure as first parameter', callback)
    }

    this.$queryListeners.push(callback)
    return this
  }

  /**
   * Adds a new trait to the model. Ideally it does a very
   * simple thing and that is to pass the model class to
   * your trait and you own it from there.
   *
   * @method addTrait
   *
   * @param  {Function|String} trait - A plain function or reference to IoC container string
   */
  static addTrait (trait, options = {}) {
    if (typeof (trait) !== 'function' && typeof (trait) !== 'string') {
      throw GE
        .InvalidArgumentException
        .invalidParameter('Model.addTrait expects an IoC container binding or a closure', trait)
    }

    /**
     * If trait is a string, then point to register function
     */
    trait = typeof (trait) === 'string' ? `${trait}.register` : trait
    const { method } = resolver.forDir('modelTraits').resolveFunc(trait)
    method(this, options)
  }

  /**
   * Creates a new model instances from payload
   * and also persist it to database at the
   * same time.
   *
   * @method create
   *
   * @param  {Object} payload
   * @param  {Object} [trx]
   *
   * @return {Model} Model instance is returned
   */
  static async create (payload, trx) {
    const modelInstance = new this()
    modelInstance.fill(payload)
    await modelInstance.save(trx)
    return modelInstance
  }

  /**
   * Returns the latest row from the database.
   *
   * @method last
   * @async
   *
   * @param  {String} field
   *
   * @return {Model|Null}
   */
  static last (field = this.primaryKey) {
    return this.query().last(field)
  }

  /**
   * Creates many instances of model in parallel.
   *
   * @method createMany
   *
   * @param  {Array} payloadArray
   * @param  {Object} [trx]
   *
   * @return {Array} Array of model instances is returned
   *
   * @throws {InvalidArgumentException} If payloadArray is not an array
   */
  static async createMany (payloadArray, trx) {
    if (!Array.isArray(payloadArray)) {
      throw GE
        .InvalidArgumentException
        .invalidParameter(`${this.name}.createMany expects an array of values`, payloadArray)
    }
    return Promise.all(payloadArray.map((payload) => this.create(payload, trx)))
  }

  /**
   * Deletes all rows of this model (truncate table).
   *
   * @method truncate
   *
   * @return {Promise<void>}
   */
  static truncate () {
    const query = this.query()
    return query.truncate()
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
   * Formats the date fields from the payload, only
   * when they are marked as dates and there are
   * no setters defined for them.
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
        return values[date] && typeof (this[util.getSetterName(date)]) !== 'function'
      })
      .each((date) => { values[date] = this.constructor.formatDates(date, values[date]) })
  }

  /**
   * Checks for existence of setter on model and if exists
   * returns the return value of setter, otherwise returns
   * the default value.
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
    return typeof (this[getterName]) === 'function' ? this[getterName](passAttrs || value) : value
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
   * @async
   *
   * @param {Object} trx
   *
   * @return {Boolean}
   *
   * @private
   */
  async _insert (trx) {
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

    const query = this.constructor.query()

    /**
     * If trx is defined then use it for the save
     * operation.
     */
    if (trx) {
      query.transacting(trx)
    }

    /**
     * Execute query
     */
    const result = await query
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
    return true
  }

  /**
   * Update model by updating dirty attributes to the database.
   *
   * @method _update
   * @async
   *
   * @param {Object} trx
   *
   * @return {Boolean}
   */
  async _update (trx) {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('update', this)
    let affected = 0

    const query = this.constructor.query()

    /**
     * If trx is defined then use it for the update
     * operation.
     */
    if (trx) {
      query.transacting(trx)
    }

    if (this.isDirty) {
      /**
       * Set proper timestamps
      */
      this._setUpdatedAt(this.$attributes)
      this._formatDateFields(this.$attributes)

      affected = await query
        .where(this.constructor.primaryKey, this.primaryKeyValue)
        .ignoreScopes()
        .update(this)
      /**
       * Sync originals to find a diff when updating for next time
       */
      this._syncOriginals()
    }

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('update', this)
    return !!affected
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
      if (this.$attributes[field]) {
        this.$attributes[field] = moment(this.$attributes[field])
      }
    })
  }

  /**
   * Set attribute on model instance. Setting properties
   * manually or calling the `set` function has no
   * difference.
   *
   * NOTE: this method will call the setter
   *
   * @method set
   *
   * @param  {String} name
   * @param  {Mixed} value
   *
   * @return {void}
   */
  set (name, value) {
    this.$attributes[name] = this._getSetterValue(name, value)
  }

  /**
   * Converts model to an object. This method will call getters,
   * cast dates and will attach `computed` properties to the
   * object.
   *
   * @method toObject
   *
   * @return {Object}
   */
  toObject () {
    let evaluatedAttrs = _.transform(this.$attributes, (result, value, key) => {
      const isMarkedAsDate = _.includes(this.constructor.dates, key)
      const transformedValue = isMarkedAsDate && value ? moment(value) : value

      /**
       * If key is not a date OR it's a date but model has a predefine getter
       * for it, then pass the value to the getter.
       *
       * Also if the value is set to null or undefined, we pass it to the getter
       * instead of casting it as a date.
       */
      if (!isMarkedAsDate || typeof (this[util.getGetterName(key)]) === 'function' || !transformedValue) {
        result[key] = this._getGetterValue(key, transformedValue)
        return result
      }

      /**
       * Otherwise cast the field as date
       */
      result[key] = this.constructor.castDates(key, transformedValue)
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
    if (_.isArray(this.$visible)) {
      evaluatedAttrs = _.pick(evaluatedAttrs, this.$visible)
    } else if (_.isArray(this.$hidden)) {
      evaluatedAttrs = _.omit(evaluatedAttrs, this.$hidden)
    }

    return evaluatedAttrs
  }

  /**
   * Persist model instance to the database. It will create
   * a new row when model has not been persisted already,
   * otherwise will update it.
   *
   * @method save
   * @async
   *
   * @param {Object} trx Transaction object to be used
   *
   * @return {Boolean} Whether or not the model was persisted
   */
  async save (trx) {
    return this.isNew ? this._insert(trx) : this._update(trx)
  }

  /**
   * Deletes the model instance from the database. Also this
   * method will freeze the model instance for updates.
   *
   * @method delete
   * @async
   *
   * @return {Boolean}
   */
  async delete () {
    /**
     * Executing before hooks
     */
    await this.constructor.$hooks.before.exec('delete', this)

    const affected = await this.constructor
      .query()
      .where(this.constructor.primaryKey, this.primaryKeyValue)
      .ignoreScopes()
      .delete()

    /**
     * If model was delete then freeze it modifications
     */
    if (affected > 0) {
      this.freeze()
    }

    /**
     * Executing after hooks
     */
    await this.constructor.$hooks.after.exec('delete', this)
    return !!affected
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
    this._syncOriginals()
  }

  /**
   * Find a row using the primary key
   *
   * @method find
   * @async
   *
   * @param  {String|Number} value
   *
   * @return {Model|Null}
   */
  static find (value) {
    return this.findBy(this.primaryKey, value)
  }

  /**
   * Find a row using the primary key or
   * fail with an exception
   *
   * @method findByOrFail
   * @async
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find row
   */
  static findOrFail (value) {
    return this.findByOrFail(this.primaryKey, value)
  }

  /**
   * Find a model instance using key/value pair
   *
   * @method findBy
   * @async
   *
   * @param  {String} key
   * @param  {String|Number} value
   *
   * @return {Model|Null}
   */
  static findBy (key, value) {
    return this.query().where(key, value).first()
  }

  /**
   * Find a model instance using key/value pair or
   * fail with an exception
   *
   * @method findByOrFail
   * @async
   *
   * @param  {String}     key
   * @param  {String|Number}     value
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find row
   */
  static findByOrFail (key, value) {
    return this.query().where(key, value).firstOrFail()
  }

  /**
   * Returns the first row. This method will add orderBy asc
   * clause
   *
   * @method first
   * @async
   *
   * @return {Model|Null}
   */
  static first () {
    return this.query().orderBy(this.primaryKey, 'asc').first()
  }

  /**
   * Returns the first row or throw an exception.
   * This method will add orderBy asc clause.
   *
   * @method first
   * @async
   *
   * @return {Model}
   *
   * @throws {ModelNotFoundException} If unable to find row
   */
  static firstOrFail () {
    return this.query().orderBy(this.primaryKey, 'asc').firstOrFail()
  }

  /**
   * Find a row or create a new row when it doesn't
   * exists.
   *
   * @method findOrCreate
   * @async
   *
   * @param  {Object}     whereClause
   * @param  {Object}     payload
   * @param  {Object}     [trx]
   *
   * @return {Model}
   */
  static async findOrCreate (whereClause, payload, trx) {
    if (!payload) {
      payload = whereClause
    }

    /**
     * Find a row using where clause
     */
    const row = await this.query().where(whereClause).first()
    if (row) {
      return row
    }

    /**
     * Otherwise create one
     */
    return this.create(payload, trx)
  }

  /**
   * Find row from database or returns an instance of
   * new one.
   *
   * @method findOrNew
   *
   * @param  {Object}  whereClause
   * @param  {Object}  payload
   *
   * @return {Model}
   */
  static async findOrNew (whereClause, payload) {
    if (!payload) {
      payload = whereClause
    }

    /**
     * Find a row using where clause
     */
    const row = await this.query().where(whereClause).first()
    if (row) {
      return row
    }

    /**
     * Newup row and fill data
     */
    const newRow = new this()
    newRow.fill(payload)

    return newRow
  }

  /**
   * Fetch everything from the database
   *
   * @method all
   * @async
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
   * @async
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
   * @async
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
   * @async
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
   * @async
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
      .each((val) => (val.$parent = this.constructor.name))
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
   * @async
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
   * Just like @ref('Model.load') but instead loads multiple relations for a
   * single model instance.
   *
   * @method loadMany
   * @async
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
  hasOne (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey

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
  hasMany (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey

    return new HasMany(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('BelongsTo') relation
   *
   * @method belongsTo
   *
   * @param  {String|Class}  relatedModel
   * @param  {String}        primaryKey
   * @param  {String}        foreignKey
   *
   * @return {BelongsTo}
   */
  belongsTo (relatedModel, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || relatedModel.foreignKey
    foreignKey = foreignKey || relatedModel.primaryKey

    return new BelongsTo(this, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns an instance of @ref('BelongsToMany') relation
   *
   * @method belongsToMany
   *
   * @param  {Class|String}      relatedModel
   * @param  {String}            foreignKey
   * @param  {String}            relatedForeignKey
   * @param  {String}            primaryKey
   * @param  {String}            relatedPrimaryKey
   *
   * @return {BelongsToMany}
   */
  belongsToMany (relatedModel, foreignKey, relatedForeignKey, primaryKey, relatedPrimaryKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    foreignKey = foreignKey || this.constructor.foreignKey
    relatedForeignKey = relatedForeignKey || relatedModel.foreignKey
    primaryKey = primaryKey || this.constructor.primaryKey
    relatedPrimaryKey = relatedPrimaryKey || relatedModel.primaryKey

    return new BelongsToMany(this, relatedModel, primaryKey, foreignKey, relatedPrimaryKey, relatedForeignKey)
  }

  /**
   * Returns instance of @ref('HasManyThrough')
   *
   * @method manyThrough
   *
   * @param  {Class|String}    relatedModel
   * @param  {String}    relatedMethod
   * @param  {String}    primaryKey
   * @param  {String}    foreignKey
   *
   * @return {HasManyThrough}
   */
  manyThrough (relatedModel, relatedMethod, primaryKey, foreignKey) {
    relatedModel = typeof (relatedModel) === 'string' ? ioc.use(relatedModel) : relatedModel

    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey

    return new HasManyThrough(this, relatedModel, relatedMethod, primaryKey, foreignKey)
  }

  /**
   * Reload the model instance in memory. Some may
   * not like it, but in real use cases no one
   * wants a new instance.
   *
   * @method reload
   *
   * @return {void}
   */
  async reload () {
    if (this.$frozen) {
      throw GE.RuntimeException.invoke('Cannot reload a deleted model instance')
    }

    if (!this.isNew) {
      const newInstance = await this.constructor.find(this.primaryKeyValue)
      if (!newInstance) {
        throw GE
          .RuntimeException
          .invoke(`Cannot reload model since row with ${this.constructor.primaryKey} ${this.primaryKeyValue} has been removed`)
      }
      this.newUp(newInstance.$attributes)
    }
  }

  /**
  * Return a count of all model records.
  *
  * @method getCount
  *
  * @param  {String} columnName = '*'
  *
  * @return {Number}
  */
  static async getCount (columnName = '*') {
    return this.query().getCount(columnName)
  }

  /**
  * Return a distinct count of all model records.
  *
  * @method getCountDistinct
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getCountDistinct (columnName) {
    return this.query().getCountDistinct(columnName)
  }

  /**
  * Return the average of all values of columnName.
  *
  * @method getAvg
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getAvg (columnName) {
    return this.query().getAvg(columnName)
  }

  /**
  * Return the average of all distinct values of columnName.
  *
  * @method getAvgDistinct
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getAvgDistinct (columnName) {
    return this.query().getAvgDistinct(columnName)
  }

  /**
  * Return the minimum of all values of columnName.
  *
  * @method getMin
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getMin (columnName) {
    return this.query().getMin(columnName)
  }

  /**
  * Return the maximum of all values of columnName.
  *
  * @method getMax
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getMax (columnName) {
    return this.query().getMax(columnName)
  }

  /**
  * Return the sum of all values of columnName.
  *
  * @method getSum
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getSum (columnName) {
    return this.query().getSum(columnName)
  }

  /**
  * Return the sum of all distinct values of columnName.
  *
  * @method getSumDistinct
  *
  * @param  {String} columnName
  *
  * @return {Number}
  */
  static async getSumDistinct (columnName) {
    return this.query().getSumDistinct(columnName)
  }
}
module.exports = Model

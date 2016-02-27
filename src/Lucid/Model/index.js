'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const mixin = require('es6-class-mixin')
const NE = require('node-exceptions')
const CatLog = require('cat-log')
const logger = new CatLog('adonis:lucid')
const _ = require('lodash')
const util = require('../../../lib/util')
const QueryBuilder = require('../QueryBuilder')
const proxyHandler = require('./proxyHandler')
const AccessorMutator = require('./Mixins/AccessorMutator')
const Serializer = require('./Mixins/Serializer')
const Persistance = require('./Mixins/Persistance')
const Dates = require('./Mixins/Dates')
const Hooks = require('./Mixins/Hooks')
const moment = require('moment')
const HasOne = require('../Relations/HasOne')

class ModelNotFoundException extends NE.LogicalException {}

/**
 * list of hooks allowed to be registered for a
 * given model
 *
 * @type {Array}
 */
const validHookTypes = [
  'beforeCreate',
  'afterCreate',
  'beforeUpdate',
  'afterUpdate',
  'beforeDelete',
  'afterDelete',
  'beforeRestore',
  'afterRestore'
]

/**
 * model defines a single table inside sql database and
 * a model instance belongs to a single row inside
 * database table. Simple!
 *
 * @class
 */
class Model {

  constructor (values) {
    if (_.isArray(values)) {
      throw new NE.InvalidArgumentException('cannot initiate a model with multiple rows. Make sure to pass a flat object')
    }
    this.instantiate(values)
    return new Proxy(this, proxyHandler)
  }

  /**
   * initiates model instance parameters.
   *
   * @param  {Object} [values]
   *
   * @public
   */
  instantiate (values) {
    this.attributes = {}
    this.original = {}
    this.relations = {}
    if (values) {
      this.setJSON(values)
    }
  }

  /**
   * adds a new hook for a given type for a model. Note
   * this method has no way of checking duplicate
   * hooks.
   *
   * @param  {String} type - type of hook
   * @param  {String} [name=null] - hook name, can be used later to remove hook
   * @param  {Function|String} handler
   *
   * @example
   * Model.addHook('beforeCreate', 'User.validate')
   * Model.addHook('beforeCreate', 'validateUser', 'User.validate')
   * Model.addHook('beforeCreate', 'validateUser', function * (next) {
   *
   * })
   *
   * @public
   */
  static addHook (type, name, handler) {
    if (validHookTypes.indexOf(type) <= -1) {
      throw new NE.InvalidArgumentException(`${type} is not a valid hook type`)
    }

    /**
     * if handler is not defined, set name as handler. It is required coz
     * we have 2nd parameter optional.
     */
    if (!handler) {
      handler = name
      name = null
    }

    /**
     * handler should be a reference to a string or a valid function. Strings are
     * assumed to be a reference to hook namespace and if autoloading fails an
     * error will be thrown when calling hook
     */
    if (typeof (handler) !== 'function' && typeof (handler) !== 'string') {
      throw new NE.InvalidArgumentException('hook handler must point to a valid generator method')
    }

    this.$modelHooks[type] = this.$modelHooks[type] || []
    this.$modelHooks[type].push({handler, name})
  }

  /**
   * store state of model, whether it has been
   * booted or not
   *
   * @return {Boolean}
   *
   * @public
   */
  static get $booted () {
    return this._booted
  }

  /**
   * sets booted state for a model
   *
   * @param  {Boolean} value
   *
   * @public
   */
  static set $booted (value) {
    this._booted = value
  }

  /**
   * hook to be invoked by Ioc Container
   * when a model is required.
   *
   * @public
   */
  static bootIfNotBooted () {
    if (!this.$booted) {
      this.$booted = true
      this.boot()
    }
  }

  /**
   * boot method is only called once a model is used for
   * the first time. This is the place where anyone
   * can do required stuff before a model is
   * ready to be used.
   *
   * @public
   */
  static boot () {
    logger.verbose(`booting ${this.name} model`)
    this.$modelHooks = {}
    this.$queryListeners = []

    this.addGlobalScope((builder) => {
      if (this.deleteTimestamp && !builder.avoidTrashed) {
        builder.where(`${this.table}.${this.deleteTimestamp}`, null)
      }
    })
  }

  /**
   * adds a callback to queryListeners, which gets fired as soon
   * as a query has been made on the given model. This is a
   * nice way to listen to queries for a single model.
   *
   * @param  {Function} callback
   *
   * @public
   */
  static onQuery (callback) {
    if (typeof (callback) !== 'function') {
      throw new NE.InvalidArgumentException('onQuery only excepts a callback function')
    }
    this.$queryListeners.push(callback)
  }

  /**
   * adds global scopes to a model, global scopes are used on every
   * query.
   *
   * @param  {Function}     callback
   *
   * @public
   */
  static addGlobalScope (callback) {
    this.globalScope = this.globalScope || []
    if (typeof (callback) !== 'function') {
      throw new NE.InvalidArgumentException('global scope callback must be a function')
    }
    this.globalScope.push(callback)
  }

  /**
   * connection defines the database connection to be used
   * for making sql queries. Default means the connection
   * defined inside database config file.
   *
   * @return {String}
   *
   * @public
   */
  static get connection () {
    return 'default'
  }

  /**
   * returns the sql table name to be used for making queries from this
   * model.
   *
   * @return {String}
   *
   * @public
   */
  static get table () {
    return util.makeTableName(this)
  }

  /**
   * primary key to be used for given table. Same key is used for fetching
   * associations. Defaults to id
   *
   * @return {String}
   *
   * @public
   */
  static get primaryKey () {
    return 'id'
  }

  /**
   * foreign key for a given model to be used while resolving database
   * associations. Defaults to lowercase model name with _id.
   *
   * @example
   * user_id for User model
   * account_id for Account model
   *
   * @return {String}
   *
   * @public
   */
  static get foreignKey () {
    return util.makeForeignKey(this)
  }

  /**
   * computed properties to be attached to final result set.
   *
   * @return {Array}
   *
   * @public
   */
  static get computed () {
    return []
  }

  /**
   * date format to be used for setting dates inside the table.
   * dates will be manipulated with moment.
   *
   * @return {String}
   *
   * @public
   */
  static get dateFormat () {
    return 'YYYY-MM-DD HH:mm:ss'
  }

  /**
   * post create field will be calculated automatically, as soon
   * as a new model is saved to the database, return null
   * to avoid using postCreate timestamp
   *
   * @return {String}
   *
   * @public
   */
  static get createTimestamp () {
    return 'created_at'
  }

  /**
   * post update field will be calculated automatically, as
   * soon as model is updated to the database, return null
   * to avoid using postUpdate timestamp.
   *
   * @return {String}
   *
   * @public
   */
  static get updateTimestamp () {
    return 'updated_at'
  }

  /**
   * setting value on post delete will enable soft deletes
   * for a given model
   *
   * @return {String}
   *
   * @public
   */
  static get deleteTimestamp () {
    return null
  }

  /**
   * defines values to be hidden from the final
   * json object.
   *
   * @return {Array}
   *
   * @public
   */
  static get hidden () {
    return []
  }

  /**
   * defineds values to be visible on the final json object. Visible
   * fields have priority over hidden fields, which means if both
   * are defined the visible one will be used.
   *
   * @return {Array}
   *
   * @public
   */
  static get visible () {
    return []
  }

  /**
   * created at field getter method, by default
   * it returns an instance of moment js.
   *
   * @param  {String}      date
   * @return {Object}
   *
   * @public
   */
  getCreateTimestamp (date) {
    return moment(date).format(this.constructor.dateFormat)
  }

  /**
   * updated at field getter method, by default
   * it returns an instance of moment js.
   *
   * @param  {String}      date
   * @return {Object}
   *
   * @public
   */
  getUpdateTimestamp (date) {
    return moment(date).format(this.constructor.dateFormat)
  }

  /**
   * deleted at field getter method, by default
   * it returns an instance of moment js.
   *
   * @param  {String}      date
   * @return {Object}
   *
   * @public
   */
  getDeleteTimestamp (date) {
    return moment(date).format(this.constructor.dateFormat)
  }

  /**
   * returns query builder instance to be used for
   * creating fluent queries.
   *
   * @return {Object}
   *
   * @public
   */
  static query () {
    return new QueryBuilder(this).on('query', (query) => {
      _.each(this.$queryListeners, function (listener) {
        listener(query)
      })
    })
  }

  /**
   * returns defined number of rows by adding ASC order by
   * clause on primary key.
   *
   * @param  {Number} [limit=1]
   * @return {Array}
   *
   * @public
   */
  static * pick (limit) {
    limit = limit || 1
    return yield this.query().limit(limit).orderBy(this.primaryKey, 'asc').fetch()
  }

  /**
   * returns defined number of rows by adding DESC order by
   * clause on primary key.
   *
   * @param  {Number} [limit=1]
   * @return {Array}
   *
   * @public
   */
  static * pickInverse (limit) {
    limit = limit || 1
    return yield this.query().limit(limit).orderBy(this.primaryKey, 'desc').fetch()
  }

  /**
   * finds a record by adding a where clause with key/value
   * pair.
   *
   * @param  {String} key
   * @param  {Mixed} value
   * @return {Object}
   *
   * @public
   */
  static * findBy (key, value) {
    return yield this.query().where(key, value).first()
  }

  /**
   * finds a single record by adding where clause on model
   * primary key
   *
   * @param  {Number} value
   * @return {Object}
   *
   * @public
   */
  static * find (value) {
    return yield this.findBy(this.primaryKey, value)
  }

  /**
   * finds a single record by adding a where a clause on
   * model primary key or throws an error if nothing is
   * found.
   *
   * @param  {Number}   value
   * @return {Object}
   *
   * @throws {ModelNotFoundException} If there are zero rows found.
   *
   * @public
   */
  static * findOrFail (value) {
    const result = yield this.find(value)
    if (!result) {
      throw new ModelNotFoundException(`Unable to fetch results for ${this.primaryKey} ${value}`)
    }
    return result
  }

  /**
   * returns all records for a given model
   *
   * @return {Array}
   *
   * @public
   */
  static * all () {
    return yield this.query().fetch()
  }

  /**
   * getter to return the primaryKey value for a given
   * instance.
   *
   * @return {Number}
   *
   * @public
   */
  get $primaryKeyValue () {
    return this.attributes[this.constructor.primaryKey]
  }

  /**
   * setter to set the primaryKey value for a given
   * instance.
   *
   * @param  {Number} value
   *
   * @public
   */
  set $primaryKeyValue (value) {
    this.attributes[this.constructor.primaryKey] = value
  }

  /**
   * returns dirty values for a model instance, dirty values are
   * values changed since last persistence.
   *
   * @return {Object}
   *
   * @public
   */
  get $dirty () {
    return _.pickBy(this.attributes, (value, key) => {
      return typeof (this.original[key]) === 'undefined' || this.original[key] !== value
    })
  }

  /**
   * tells whether a model has been persisted to the
   * database or not.
   *
   * @return {Boolean}
   *
   * @public
   */
  isNew () {
    return !this.$primaryKeyValue
  }

  /**
   * freezes a model, it is used after destroy.
   *
   * @public
   */
  freeze () {
    Object.freeze(this)
  }

  /**
   * tells whether a model has been deleted or not.
   *
   * @return {Boolean}
   *
   * @public
   */
  isDeleted () {
    return Object.isFrozen(this)
  }

  /**
   * saves a model instance to the database, if exists will update the existing
   * instance, otherwise will create a new instance.
   *
   * @return {Boolean|Number}
   *
   * @public
   */
  * save () {
    if (this.isNew()) {
      return yield this.insert()
    }
    return yield this.update(this.$dirty)
  }

  /**
   * initiates and save a model instance with given
   * values. Create is a short to new Model and
   * then save.
   *
   * @param  {Object} values
   * @return {Object}
   *
   * @public
   */
  static * create (values) {
    const modelInstance = new this(values)
    yield modelInstance.save()
    return modelInstance
  }

  /**
   * returns hasOne instance for a given model. Later
   * returned instance will be responsible for
   * resolving relations
   *
   * @param  {Object}  toModel
   * @param  {String}  [primaryKey]
   * @param  {String}  [foreignKey]
   * @return {Object}
   *
   * @public
   */
  hasOne (related, primaryKey, foreignKey) {
    primaryKey = primaryKey || this.constructor.primaryKey
    foreignKey = foreignKey || this.constructor.foreignKey
    return new HasOne(this, related, primaryKey, foreignKey)
  }

  /**
   * returns eagerly loaded relation for a given model
   * instance
   *
   * @param  {String} key
   * @return {Object}
   *
   * @public
   */
  get (key) {
    return this.relations[key]
  }
}

class ExtendedModel extends mixin(Model, AccessorMutator, Serializer, Persistance, Dates, Hooks) {
}

module.exports = ExtendedModel

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
const mixin = require('es6-class-mixin')
const CE = require('../../Exceptions')
const CatLog = require('cat-log')
const cf = require('co-functional')
const logger = new CatLog('adonis:lucid')
const _ = require('lodash')
const util = require('../../../lib/util')
const QueryBuilder = require('../QueryBuilder')
const proxyHandler = require('./proxyHandler')
const Mixins = require('./Mixins')
const Relations = require('../Relations')
const BaseSerializer = require('../QueryBuilder/Serializers/Base')
const Ioc = require('adonis-fold').Ioc
const Resolver = require('adonis-binding-resolver')
const resolver = new Resolver(Ioc)

const hookNameSpace = 'Model/Hooks'

/**
 * returns a function that be executed with a key/value
 * pair. Default closure will throw an exception.
 *
 * @method
 *
 * @param  {Function} [userClosure]
 *
 * @return {Function}
 */
const getFailException = (userClosure) => {
  return typeof (userClosure) === 'function' ? userClosure : function (key, value) {
    throw CE.ModelNotFoundException.raise(`Unable to fetch results for ${key} ${value}`)
  }
}

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
      throw CE.InvalidArgumentException.bulkInstantiate(this.constructor.name)
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
    this.transaction = null // will be added via useTransaction
    this.relations = {}
    this.frozen = false
    this.eagerLoad = new Relations.EagerLoad()
    if (values) {
      this.setJSON(values)
    }
  }

  /**
   * fill bulk values to the model instance
   * attributes
   *
   * @method fill
   *
   * @param  {Object} values
   */
  fill (values) {
    this.setJSON(values)
  }

  /**
   * validates whether hooks is of valid type
   * or not
   *
   * @method  _validateIsValidHookType
   *
   * @param   {String}                 type
   *
   * @private
   */
  static _validateIsValidHookType (type) {
    if (validHookTypes.indexOf(type) <= -1) {
      throw CE.InvalidArgumentException.invalidParameter(`${type} is not a valid hook type`)
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
    this._validateIsValidHookType(type)
    const Helpers = Ioc.use('Adonis/Src/Helpers')

    if (!handler) {
      handler = name
      name = null
    }

    const resolvedHandler = typeof (handler) === 'string' ? Helpers.makeNameSpace(hookNameSpace, handler) : handler
    resolver.validateBinding(resolvedHandler)

    this.$modelHooks[type] = this.$modelHooks[type] || []
    this.$modelHooks[type].push({handler: resolver.resolveBinding(resolvedHandler), name})
  }

  /**
   * a reference to queryBuilder serializer. It
   * contains fetch and paginate methods.
   */
  static get QuerySerializer () {
    return BaseSerializer
  }

  /**
   * removes an array of named hooks from registered
   * hooks
   *
   * @param {Array} names
   *
   * @public
   */
  static removeHooks () {
    const names = _.isArray(arguments[0]) ? arguments[0] : _.toArray(arguments)
    _.each(this.$modelHooks, (hooks, type) => {
      this.$modelHooks[type] = _.filter(hooks, function (hook) {
        return names.indexOf(hook.name) <= -1
      })
    })
  }

  /**
   * alias of removeHooks
   * @see removeHooks
   *
   * @param {String} name
   *
   * @public
   */
  static removeHook () {
    this.removeHooks.apply(this, arguments)
  }

  /**
   * defines an array of hooks in one go.
   *
   * @param {String} type
   * @param {Array} hooks
   *
   * @public
   */
  static defineHooks () {
    this.$modelHooks = {}
    const args = _.toArray(arguments)
    const type = args[0]
    const hooks = _.tail(args)
    _.each(hooks, (hook) => {
      this.addHook(type, hook)
    })
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
    this.traits.forEach(this.use.bind(this))

    this.addGlobalScope((builder) => {
      if (this.deleteTimestamp && !builder.avoidTrashed) {
        builder.whereNull(`${this.table}.${this.deleteTimestamp}`)
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
      throw CE.InvalidArgumentException.invalidParameter('onQuery callback must be a function')
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
      throw CE.InvalidArgumentException.invalidParameter('global scope callback must be a function')
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
   * traits to be used on the model. These
   * are loaded once a model is booted.
   *
   * @method traits
   *
   * @return {Array}
   */
  static get traits () {
    return []
  }

  /**
   * this method assigns a trait to the model.
   *
   * @method use
   *
   * @param  {String} trait
   */
  static use (trait) {
    let resolvedTrait = Ioc.make(trait)
    if (!resolvedTrait.register) {
      throw CE.InvalidArgumentException.invalidTrait()
    }
    resolvedTrait.register(this)
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
    return this.formatDate(date)
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
    return this.formatDate(date)
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
    return this.formatDate(date)
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
    return yield this.query().pick(limit)
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
    return yield this.query().pickInverse(limit)
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
   * paginates over a result set
   *
   * @param  {Number} page
   * @param  {Number} [perPage=20]
   *
   * @return {Array}
   *
   * @public
   */
  static * paginate (page, perPage) {
    return yield this.query().paginate(page, perPage)
  }

  /**
   * finds a single record by adding a where a clause on
   * model primary key or throws an error if nothing is
   * found.
   *
   * @param  {Number}   value
   * @param  {Function} [onErrorCallback]
   * @return {Object}
   *
   * @throws {ModelNotFoundException} If there are zero rows found.
   *
   * @public
   */
  static * findOrFail (value, onErrorCallback) {
    const result = yield this.find(value)
    if (!result) {
      return getFailException(onErrorCallback)(this.primaryKey, value)
    }
    return result
  }

  /**
   * find for a row using key/value pairs
   * or fail by throwing an exception.
   *
   * @method findByOrFail
   *
   * @param  {String}     key
   * @param  {Mixed}     value
   * @param  {Function}  [onErrorCallback]
   *
   * @return {Object}
   */
  static * findByOrFail (key, value, onErrorCallback) {
    const result = yield this.findBy(key, value)
    if (!result) {
      return getFailException(onErrorCallback)(key, value)
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
   * returns all records for a given model
   * with all primary keys in an array.
   *
   * @return {Array}
   *
   * @public
   */
  static * ids () {
    return yield this.query().ids()
  }

  /**
   * returns a pair wit lhs and rhs fields for a given model.
   * It is helpful in populating select boxes.
   *
   * @param  {String} lhs
   * @param  {String} rhs
   * @return {Object}
   *
   * @public
   */
  static * pair (lhs, rhs) {
    return yield this.query().pair(lhs, rhs)
  }

  /**
   * truncate model database table
   *
   * @method truncate
   *
   * @return {Boolean}
   */
  static * truncate () {
    return yield this.query().truncate()
  }

  /**
   * shorthand to get access to the with method on
   * query builder chain.
   *
   * @return {Object}
   *
   * @public
   */
  static with () {
    const args = _.toArray(arguments)
    return this.query().with(args)
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
      return (typeof (this.original[key]) === 'undefined' || this.original[key] !== value) && !key.startsWith('_pivot_')
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
    this.frozen = true
  }

  /**
   * unfreezes a given model, this usually happens
   * after restore
   *
   * @public
   */
  unfreeze () {
    this.frozen = false
  }

  /**
   * tells whether a model has been deleted or not.
   *
   * @return {Boolean}
   *
   * @public
   */
  isDeleted () {
    return this.frozen
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
    return yield this.update()
  }

  /**
   * returns a fresh model instance, it is
   * useful when database has defaults
   * set.
   *
   * @method fresh
   *
   * @return {Object}
   */
  * fresh () {
    if (this.isNew()) {
      return this
    }
    return yield this.constructor.find(this.$primaryKeyValue)
  }

  /**
   * uses a transaction for all upcoming
   * operations
   *
   * @method useTransaction
   *
   * @param  {Object}       trx
   */
  useTransaction (trx) {
    this.transaction = trx
  }

  /**
   * resets transaction of the model instance
   *
   * @method resetTransaction
   */
  resetTransaction () {
    this.transaction = null
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
   * try to find a record with given attributes or create
   * a new record if nothing found.
   *
   * @param  {Object} attributes
   * @param  {Object} values
   *
   * @return {Object}
   */
  static * findOrCreate (attributes, values) {
    if (!attributes || !values) {
      throw CE.InvalidArgumentException.missingParameter('findOrCreate expects both search attributes and values to persist')
    }
    const firstRecord = yield this.query().where(attributes).first()
    if (firstRecord) {
      return firstRecord
    }
    return yield this.create(values)
  }

  /**
   * creates many model instances by persiting them to the
   * database. All of it happens parallely.
   *
   * @param  {Array} arrayOfValues [description]
   * @return {Array}               [description]
   *
   * @public
   */
  static * createMany (arrayOfValues) {
    if (arrayOfValues instanceof Array === false) {
      throw CE.InvalidArgumentException.invalidParameter('createMany expects an array of values')
    }
    const self = this
    return cf.map(function * (values) {
      return yield self.create(values)
    }, arrayOfValues)
  }

  /**
   * returns hasOne instance for a given model. Later
   * returned instance will be responsible for
   * resolving relations
   *
   * @param  {Object}  related
   * @param  {String}  [primaryKey]
   * @param  {String}  [foreignKey]
   * @return {Object}
   *
   * @public
   */
  hasOne (related, primaryKey, foreignKey) {
    return new Relations.HasOne(this, related, primaryKey, foreignKey)
  }

  /**
   * returns hasMany instance for a given model. Later
   * returned instance will be responsible for
   * resolving relations
   *
   * @param  {Object}  related
   * @param  {String}  [primaryKey]
   * @param  {String}  [foreignKey]
   * @return {Object}
   *
   * @public
   */
  hasMany (related, primaryKey, foreignKey) {
    return new Relations.HasMany(this, related, primaryKey, foreignKey)
  }

  /**
   * returns belongsTo instance for a given model. Later
   * returned instance will be responsible for
   * resolving relations
   *
   * @param  {Object}  related
   * @param  {String}  [primaryKey]
   * @param  {String}  [foreignKey]
   * @return {Object}
   *
   * @public
   */
  belongsTo (related, primaryKey, foreignKey) {
    return new Relations.BelongsTo(this, related, primaryKey, foreignKey)
  }

  /**
   * returns belongsToMany instance for a given model. Later
   * returned instance will be responsible for resolving
   * relations.
   *
   * @param  {Object}      related
   * @param  {String}      [pivotTable]
   * @param  {String}      [pivotLocalKey]
   * @param  {String}      [pivotOtherKey]
   * @param  {String}      [primaryKey]
   * @param  {String}      [relatedPrimaryKey]
   * @return {Object}
   *
   * @public
   */
  belongsToMany (related, pivotTable, pivotLocalKey, pivotOtherKey, primaryKey, relatedPrimaryKey) {
    return new Relations.BelongsToMany(this, related, pivotTable, pivotLocalKey, pivotOtherKey, primaryKey, relatedPrimaryKey)
  }

  /**
   * returns HasManyThrough instance for a given model. Later
   * returned instance will be responsible for resolving relations.
   *
   * @param  {Object}      related
   * @param  {String}      through
   * @param  {String}      [primaryKey]
   * @param  {String}      [foreignKey]
   * @param  {String}      [throughPrimaryKey]
   * @param  {String}      [throughForeignKey]
   * @return {Object}
   *
   * @public
   */
  hasManyThrough (related, through, primaryKey, foreignKey, throughPrimaryKey, throughForeignKey) {
    return new Relations.HasManyThrough(this, related, through, primaryKey, foreignKey, throughPrimaryKey, throughForeignKey)
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

  /**
   * this method will register relations to be eagerly loaded
   * for a given model instance
   *
   * @return {Object}
   *
   * @public
   */
  related () {
    const relations = _.isArray(arguments[0]) ? arguments[0] : _.toArray(arguments)
    this.eagerLoad.with(relations)
    return this
  }

  /**
   * this method will add scope to eagerly registered relations
   * for a given model instance
   *
   * @return {Object}
   *
   * @public
   */
  scope (key, callback) {
    this.eagerLoad.appendScope(key, callback)
    return this
  }

  /**
   * returned hooks will be called by IoC
   * container everytime a give model
   * is used.
   *
   * @method IocHooks
   *
   * @private
   */
  static get IocHooks () {
    return ['bootIfNotBooted']
  }

  /**
   * here we tell the IoC container to return the
   * actual model instead of it's instance when
   * trying to inject/make it.
   *
   * @return {Boolean}
   *
   * @private
   */
  static get makePlain () {
    return true
  }

  /**
   * here we eagerly load previously registered relations
   *
   * @public
   */
  * load () {
    const eagerLoadResult = yield this.eagerLoad.load(this.attributes, this, true)
    this.eagerLoad.mapRelationsToRow(eagerLoadResult, this, this.attributes)
    this.eagerLoad.reset()
  }
}

class ExtendedModel extends mixin(
  Model,
  Mixins.AccessorMutator,
  Mixins.Serializer,
  Mixins.Persistance,
  Mixins.Dates,
  Mixins.Hooks
) {}

module.exports = ExtendedModel

'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const CatLog = require('cat-log')
const cf = require('co-functional')
const logger = new CatLog('adonis:lucid')

const Migrate = exports = module.exports = {}

/**
 * migrates a class by calling up or down
 * method on it.
 *
 * @method _migrateClass
 *
 * @param  {Object}      schema
 * @param  {String}      method
 * @return {void}
 *
 * @private
 */
Migrate._migrateClass = function (schemaInstance, method) {
  this._decorateSchema(schemaInstance)
  if (!schemaInstance[method]) {
    logger.warn('skipping migration as %s is not defined', method)
    return
  }
  this._executeSchema(schemaInstance, method)
}

/**
 * this method will call the up or down method on schema instance
 * and will register schema definations to be executed with
 * the migrations store.
 *
 * @method _executeSchema
 *
 * @param  {Object}       schemaInstance
 * @param  {String}       direction
 *
 * @private
 */
Migrate._executeSchema = function (schemaInstance, direction) {
  schemaInstance[direction]()
  _.each(schemaInstance.store, (schemas, method) => {
    this._callSchemaActions(schemas, schemaInstance.constructor.connection, method)
  })
}

/**
 * this method will loop through all the schema actions
 * defined inside a single method (up/down).
 *
 * @method _callSchemaActions
 *
 * @param  {Array}           actions
 * @param  {Object}          connection
 * @param  {String}          method
 *
 * @private
 */
Migrate._callSchemaActions = function (actions, connection, method) {
  _.each(actions, (defination) => {
    const builder = this.database.connection(connection).schema
    const migration = builder[method](defination.key, this._schemaCallback(defination.callback))
    this.migrations.push(migration)
  })
}

/**
 * calls the schema methods callback, while executing the callback
 * it will decorate the table object passed to the callback.
 *
 * @method _schemaCallback
 *
 * @param  {Function}      callback
 *
 * @private
 */
Migrate._schemaCallback = function (callback) {
  const self = this
  return function (table) {
    self._decorateTable(table)
    callback(table)
  }
}

/**
 * adds custom methods to schema instance.
 *
 * @method _decorateSchema
 *
 * @param  {Object}        schemaInstance
 *
 * @private
 */
Migrate._decorateSchema = function (schemaInstance) {
  schemaInstance.fn = this.database.fn
}

/**
 * decorates schema callback table object by adding
 * new methods on it.
 *
 * @method _decorateTable
 *
 * @param  {Object}       table
 *
 * @private
 */
Migrate._decorateTable = function (table) {
  table.softDeletes = function () {
    table.dateTime('deleted_at').nullable()
  }
  table.nullableTimestamps = function () {
    table.dateTime('created_at').nullable()
    table.dateTime('updated_at').nullable()
  }
}

/**
 * creates migrations table if it does not exists.
 * creating table needs to be first step
 *
 * @method _makeMigrationsTable
 *
 * @return {Object}
 *
 * @private
 */
Migrate._makeMigrationsTable = function () {
  return this
    .database
    .schema
    .createTableIfNotExists(this.migrationsTable, function (table) {
      table.increments('id')
      table.string('name')
      table.integer('batch')
      table.timestamp('migration_time')
    })
}

/**
 * calls the migrations queue in sequence
 *
 * @method _executeMigrations
 *
 * @return {Array}
 *
 * @private
 */
Migrate._executeMigrations = function * () {
  return cf.forEachSerial(function * (item) {
    return yield item
  }, this.migrations)
}

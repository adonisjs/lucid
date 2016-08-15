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
const CE = require('../../Exceptions')
const logger = new CatLog('adonis:lucid')

const Migrate = exports = module.exports = {}

/**
 * migrates a class by calling up or down
 * method on it.
 *
 * @method _translateActions
 *
 * @param  {Object}      schema
 * @param  {String}      direction
 * @return {void}
 *
 * @private
 */
Migrate._translateActions = function (schemaInstance, direction) {
  this._decorateSchema(schemaInstance)
  if (!schemaInstance[direction]) {
    logger.warn('skipping migration as %s is not defined', direction)
    return
  }
  schemaInstance[direction]()
  return _.map(schemaInstance.actions, (props) => {
    return this._callSchemaActions(props, schemaInstance.constructor.connection)
  })
}

/**
 * this method will loop through all the schema actions
 * defined inside a single method (up/down).
 *
 * @method _callSchemaActions
 *
 * @param  {Array}           props
 * @param  {Object}          connection
 * @param  {String}          action
 *
 * @private
 */
Migrate._callSchemaActions = function (defination, connection) {
  const builder = this.database.connection(connection).schema
  return builder[defination.action](defination.key, this._wrapSchemaCallback(defination.callback))
}

/**
 * calls the schema methods callback, while executing the callback
 * it will decorate the table object passed to the callback.
 *
 * @method _wrapSchemaCallback
 *
 * @param  {Function}      callback
 *
 * @private
 */
Migrate._wrapSchemaCallback = function (callback) {
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
  schemaInstance.schema = this.database.schema
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
Migrate._executeMigrations = function * (migrations, direction, batchNumber) {
  const self = this
  yield cf.forEachSerial(function * (migration) {
    return yield self._executeActions(_.flatten(migration.actions), migration.file, direction, batchNumber)
  }, migrations)
}

/**
 * executes an array of actions defined in a single file in sequence
 *
 * @param {Arrau} actions
 * @param {String} file
 * @param {String} direction
 * @param {Number} batchNumber
 *
 * @private
 */
Migrate._executeActions = function * (actions, file, direction, batchNumber) {
  yield cf.forEachSerial(function * (action) {
    return yield action
  }, _.flatten(actions))

  /**
   * updating batch number after running all actions
   */
  direction === 'down' ? yield this._revertProgress(file) : yield this._updateProgress(file, batchNumber)
}

/**
 * returns difference of migrations to be used for
 * creation or rollback based upon the direction.
 *
 * @param  {Object}        files
 * @param  {Array}         values
 * @param  {String}        direction
 * @return {Object}
 *
 * @example
 *   input>> {'2015-10-20_users': Users, ['2015-10-20_users'], 'up'}
 *   output>> {}
 *
 * @private
 */
Migrate._getMigrationsList = function (files, values, direction) {
  const diff = direction === 'down' ? _.reverse(_.intersection(values, _.keys(files))) : _.difference(_.keys(files), values)

  return _.reduce(diff, (result, name) => {
    result[name] = files[name]
    return result
  }, {})
}

/**
 * map list of migrations to an array of actions.
 *
 * @param      {Object}  migrationsList
 * @return     {Array}
 *
 * @example
 * input >>> {'2015-10-30': Users}
 * output >>> [{file: '2015-10-30', actions: [knex actions]}]
 *
 * @private
 */
Migrate._mapMigrationsToActions = function (migrationsList, direction) {
  return _.map(migrationsList, (File, fileName) => {
    if (typeof (File) !== 'function') {
      throw CE.DomainException.invalidSchemaFile(fileName)
    }
    return {file: fileName, actions: this._translateActions(new File(), direction)}
  })
}

/**
 * return list of migrated files saved inside migrations
 * table.
 *
 * @return     {Array}  The migrated files.
 *
 * @private
 */
Migrate._getMigratedFiles = function () {
  return this.database.select('name').from(this.migrationsTable).pluck('name')
}

/**
 * returns list of migration files till a give batch number
 * this is used to rollback migrations till a given batch
 *
 * @param      {Number}  batch   The batch
 * @return     {Array}
 *
 * @private
 */
Migrate._getFilesTillBatch = function (batch) {
  return this.database
    .select('name')
    .from(this.migrationsTable)
    .where('batch', '>', batch)
    .pluck('name')
}

/**
 * returns an array of queries sql output next and
 * file name.
 *
 * @param   {Array} migrations
 *
 * @return  {Array}
 *
 * @private
 */
Migrate._toSql = function (migrations) {
  return _.transform(migrations, (result, migration) => {
    const queries = _.map(migration.actions, (action) => {
      return action.toString()
    })
    result.push({file: migration.file, queries})
    return result
  }, [])
}

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

class Runner {

  constructor (Database, Config) {
    this.database = Database
    this.migrationsTable = Config.get('database.migrationsTable', 'adonis_schema')
    this.lockTable = `${this.migrationsTable}_lock`
    this.migrations = []
  }

  /**
   * makes a new lock table if does not exists already
   *
   * @return {Object}
   *
   * @private
   */
  _makeLockTable () {
    return this.database.schema
      .createTableIfNotExists(this.lockTable, function (table) {
        table.increments('id')
        table.boolean('is_locked')
      })
  }

  /**
   * adds a lock on migrations
   *
   * @private
   */
  _addLock () {
    return this.database.insert({is_locked: 1}).into(this.lockTable)
  }

  /**
   * checks whether there is a lock on
   * migrations table or not.
   *
   * @return {Object}
   *
   * @private
   */
  * _checkLock () {
    const result = yield this.database
      .from(this.lockTable)
      .where('is_locked', 1)
      .orderBy('id', 'desc')
      .limit(1)

    if (_.size(result)) {
      throw new Error(`Migrations are locked, make sure you are not running multiple migration process or delete ${this.lockTable} table from database`)
    }
    return false
  }

  /**
   * removes migrations lock by drop the
   * lock table
   *
   * @return {Object}
   *
   * @private
   */
  _freeLock () {
    return this.database.schema.dropTable(this.lockTable)
  }

  /**
   * creates migrations table if it does not exists.
   * creating table needs to be first step
   *
   * @return {Object}
   *
   * @private
   */
  _makeMigrationsTable () {
    return this.database.schema.createTableIfNotExists(this.migrationsTable, function (table) {
      table.increments('id')
      table.string('name')
      table.integer('batch')
      table.timestamp('migration_time')
    })
  }

  /**
   * returns difference of migrations to be
   * used for creation or rollback.
   *
   * @param  {Array}        files
   * @param  {Array}        values
   * @param  {String}       direction
   * @return {Array}
   *
   * @private
   */
  _getDifference (files, values, direction) {
    let difference = _.difference(_.keys(files), values)
    if (direction === 'down') {
      difference = _.reverse(_.intersection(values, _.keys(files)))
    }
    _.each(difference, (file) => {
      if (typeof (files[file]) !== 'function') {
        throw new Error(`Make sure you are exporting a class from ${file}`)
      }
      this._migrateClass(new files[file](), direction)
    })
    return difference
  }

  /**
   * this query sets dynamic where clause to select the
   * given batch
   *
   * @param  {Object}          builder
   * @param  {Number}          batch
   *
   * @private
   */
  _dynamicBatchQuery (builder, subquery, batch) {
    if (batch === 0 || batch) {
      builder.where('batch', '>', batch)
    } else {
      builder.where('batch', subquery)
    }
  }

  /**
   * returns difference of files to be used for migrations
   * also auto sets migrations on runner instance
   *
   * @param  {Array} files
   * @param  {Sring} direction
   * @param  {Number} batch
   * @return {Array}
   *
   * @private
   */
  * _diff (files, direction, batch) {
    /**
     * pull all migrations from migrations table when direction
     * is up
     */
    let query = this.database.select('name').from(this.migrationsTable).pluck('name')

    if (direction === 'down') {
      const subquery = this.database.from(this.migrationsTable).max('batch as batch')
      query = this.database
        .select('name')
        .from(this.migrationsTable)
        .modify(this._dynamicBatchQuery, subquery, batch)
        .pluck('name')
    }
    yield this._makeMigrationsTable()
    const values = yield query
    const result = this._getDifference(files, values, direction)
    return result
  }

  /**
   * decorates schema callback table object by adding
   * new methods on it.
   *
   * @param  {Object}       table
   *
   * @private
   */
  _decorateTable (table) {
    table.softDeletes = function () {
      return table.timestamp('deleted_at').nullable()
    }
    table.nullableTimestamps = function () {
      return table.timestamps().nullable()
    }
  }

  /**
   * migrates a class by calling up or down
   * method on it.
   *
   * @param  {Object}      schema
   * @param  {String}      method
   * @return {void}
   *
   * @private
   */
  _migrateClass (migrationClass, method) {
    const self = this
    migrationClass.fn = this.database.fn
    if (!migrationClass[method]) {
      logger.warn('skipping migration as %s is not defined', method)
      return
    }
    migrationClass[method]()
    _.each(migrationClass.store, (schemas, name) => {
      const connection = this.database.connection(migrationClass.constructor.connection)
      _.each(schemas, (defination) => {
        const migration = connection.schema[name](defination.key, function (table) {
          self._decorateTable(table)
          defination.callback(table)
        })
        this.migrations.push(migration)
      })
    })
  }

  /**
   * returns lastest batch inside migrations
   * table
   *
   * @return {Number}
   *
   * @private
   */
  * _getLatestBatch () {
    const result = yield this.database
      .table(this.migrationsTable)
      .max('batch as max_batch')

    const batchNumber = result[0].max_batch || 0
    return batchNumber
  }

  /**
   * updates batch with all newly created
   * migrations
   *
   * @param  {Array}     difference
   * @return {Object}
   *
   * @private
   */
  * _updateBatch (difference) {
    let batchNumber = yield this._getLatestBatch()
    batchNumber++
    difference = _.map(difference, function (migration) {
      return {name: migration, batch: batchNumber, migration_time: new Date()}
    })
    return yield this.database
      .table(this.migrationsTable)
      .insert(difference)
  }

  /**
   * deletes an entire batch from migrations table, required
   * when rolling back
   *
   * @return {Object}
   *
   * @private
   */
  * _deleteBatch () {
    const batchNumber = yield this._getLatestBatch()
    return yield this.database
      .table(this.migrationsTable)
      .where('batch', batchNumber)
      .delete()
  }

  /**
   * sets up a queue of migrations to be run
   * in a sequence
   *
   * @method _waterFallMigrations
   * @return {Array}
   *
   * @private
   */
  * _waterFallMigrations () {
    return cf.forEachSerial(function * (item) {
      return yield item
    }, this.migrations)
  }

  /**
   * runs all migrations in a given direction
   *
   * @param  {Array} difference
   * @param  {String} direction
   * @return {Object}
   *
   * @private
   */
  * _run (difference, direction) {
    yield this._makeLockTable()
    yield this._checkLock()
    yield this._addLock()
    try {
      yield this._waterFallMigrations()
      if (direction === 'down') {
        yield this._deleteBatch()
      } else {
        yield this._updateBatch(difference)
      }
      yield this._freeLock()
    } catch (e) {
      yield this._freeLock()
      throw e
    }
  }

  /**
   * runs up on all new migrations
   *
   * @param  {Array} files
   * @return {Object}
   *
   * @public
   */
  * up (files) {
    const migrate = yield this._diff(files, 'up')
    let status = 'skipped'
    if (_.size(migrate) > 0) {
      yield this._run(migrate, 'up')
      status = 'completed'
    }
    this.database.close()
    return {migrated: migrate, status}
  }

  /**
   * runs down on all latest batch migrations
   *
   * @param  {Array} files
   * @return {Object}
   *
   * @public
   */
  * down (files, batch) {
    const migrate = yield this._diff(files, 'down', batch)
    let status = 'skipped'
    if (_.size(migrate) > 0) {
      yield this._run(migrate, 'down')
      status = 'completed'
    }
    this.database.close()
    return {migrated: migrate, status}
  }
}

module.exports = Runner

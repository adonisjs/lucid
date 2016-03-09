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
const mixin = require('es6-class-mixin')
const Lock = require('./Mixins/Lock')
const Migrate = require('./Mixins/Migrate')
const Batch = require('./Mixins/Batch')

class Migrations {

  constructor (Database, Config) {
    this.database = Database
    this.migrationsTable = Config.get('database.migrationsTable', 'adonis_schema')
    this.lockTable = `${this.migrationsTable}_lock`
    this.migrations = []
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
      yield this._executeMigrations()
      if (direction === 'down') {
        yield this._deleteBatch()
      } else {
        yield this._incrementBatch(difference)
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

class ExtendedMigrations extends mixin(Migrations, Lock, Migrate, Batch) {}

module.exports = ExtendedMigrations

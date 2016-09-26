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
const Mixins = require('./Mixins')
let ConfigReference = null
let DatabaseReference = null

class Migrations {

  constructor () {
    this.database = DatabaseReference
    this.migrationsTable = ConfigReference.get('database.migrationsTable', 'adonis_schema')
    this.lockTable = `${this.migrationsTable}_lock`
    this.migrations = []
  }

  /**
   * runs up on all new migrations
   *
   * @param  {Array} files
   * @param  {Boolean} toSql
   * @return {Object}
   *
   * @public
   */
  * up (files, toSql) {
    yield this._makeMigrationsTable()
    const migratedFiles = yield this._getMigratedFiles()
    const migrations = this._getMigrationsList(files, migratedFiles, 'up')

    /**
     * return if nothing to migrate
     */
    if (_.size(migrations) <= 0) {
      this.database.close()
      return {migrated: [], status: 'skipped'}
    }

    const migrationActions = this._mapMigrationsToActions(migrations, 'up')
    /**
     * if SQL required return SQL
     */
    if (toSql) {
      const sqlQueries = this._toSql(migrationActions)
      this.database.close()
      return sqlQueries
    }

    const nextBatch = yield this._getNextBatchNumber()
    yield this._makeLockTable()
    yield this._checkLock()
    yield this._addLock()
    try {
      yield this._executeMigrations(migrationActions, 'up', nextBatch)
      yield this._deleteLock()
      return {migrated: _.keys(migrations), status: 'completed'}
    } catch (e) {
      yield this._deleteLock()
      throw e
    } finally {
      this.database.close()
    }
  }

  /**
   * runs down on all latest batch migrations
   *
   * @param  {Array} files
   * @param  {Number} [batch={latest}]
   * @param  {Boolean} [toSql=false]
   * @return {Object}
   *
   * @public
   */
  * down (files, batch, toSql) {
    yield this._makeMigrationsTable()
    if (!batch && batch !== 0) {
      batch = yield this._getRecentBatchNumber()
    }
    const migratedFiles = yield this._getFilesTillBatch(batch)
    const migrations = this._getMigrationsList(files, migratedFiles, 'down')

    /**
     * return if nothing to rollback
     */
    if (_.size(migrations) <= 0) {
      this.database.close()
      return {migrated: [], status: 'skipped'}
    }

    const migrationActions = this._mapMigrationsToActions(migrations, 'down')

    /**
     * if sql required return SQL
     */
    if (toSql) {
      const sqlQueries = this._toSql(migrationActions)
      this.database.close()
      return sqlQueries
    }

    yield this._makeLockTable()
    yield this._checkLock()
    yield this._addLock()
    try {
      yield this._executeMigrations(migrationActions, 'down')
      yield this._deleteLock()
      return {migrated: _.keys(migrations), status: 'completed'}
    } catch (e) {
      yield this._deleteLock()
      throw e
    } finally {
      this.database.close()
    }
  }

  /**
   * returns current status of migrations
   *
   * @param  {Array} files
   * @return {Object}
   *
   * @public
   */
  * status (files) {
    yield this._makeMigrationsTable()
    const migratedFiles = yield this._getMigratedFiles()
    this.database.close()
    return _.transform(files, function (result, file, name) {
      if (migratedFiles.indexOf(name) > -1) {
        result[name] = 'Y'
      } else {
        result[name] = 'N'
      }
    })
  }
}

class ExtendedMigrations extends mixin(Migrations, Mixins.Lock, Mixins.Migrate, Mixins.Batch) {}

class MigrationsManager {
  constructor (Database, Config) {
    DatabaseReference = Database
    ConfigReference = Config
    return ExtendedMigrations
  }
}

module.exports = MigrationsManager

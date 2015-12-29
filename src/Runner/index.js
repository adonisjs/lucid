'use strict'

/**
 * adonis-lucid
 * Copyright(c) 2015-2015 Harminder Virk
 * MIT Licensed
*/

const _ = require('lodash')
const Q = require('q')
const CatLog = require('cat-log')
const log = new CatLog('adonis:lucid')

class Runner {

  constructor (Config) {
    const connection = Config.get('database.connection')
    const config = Config.get(`database.${connection}`)
    this.knex = require('knex')(config)
    this.migrationsTable = Config.get('database.migrationsTable', 'adonis_schema')
    this.lockTable = `${this.migrationsTable}_lock`
    this.migrations = []
  }

  /**
   * @description makes a new lock table if does not exists already
   * @method _makeLockTable
   * @return {Object}
   * @private
   */
  _makeLockTable () {
    return this.knex.schema
      .createTableIfNotExists(this.lockTable, function (table) {
        table.increments('id')
        table.boolean('is_locked')
      })
  }

  /**
   * @description checks whether there is a lock on
   * migrations table or not
   * @method _checkLock
   * @return {Object}
   * @private
   */
  _checkLock () {
    return new Promise((resolve, reject) => {
      this.knex
        .from(this.lockTable)
        .where('is_locked', 1)
        .orderBy('id', 'desc')
        .limit(1)
        .then((result) => {
          if (_.size(result)) {
            throw new Error(`Migrations are locked, make sure you are not running multiple migration process or delete ${this.lockTable} table from database`)
          }
          resolve()
        })
        .catch(reject)
    })
  }

  /**
   * @description adds a lock on migrations
   * @method _addLock
   * @private
   */
  _addLock () {
    return this.knex
      .table(this.lockTable)
      .insert({is_locked: 1})
  }

  /**
   * @description removes migrations lock by drop the
   * lock table
   * @method _freeLock
   * @return {Object}
   * @private
   */
  _freeLock () {
    return this.knex.schema.dropTable(this.lockTable)
  }

  /**
   * @description creates migrations table if it does not exists.
   * creating table needs to be first step
   * @method _makeMigrationsTable
   * @return {Object}
   * @private
   */
  _makeMigrationsTable () {
    return this.knex.schema
      .createTableIfNotExists(this.migrationsTable, function (table) {
        table.increments('id')
        table.string('name')
        table.integer('batch')
        table.timestamp('migration_time')
      })
  }

  /**
   * @description returns difference between of migrations to be
   * used for creation or rollback.
   * @method _getDifference
   * @param  {Array}       files
   * @param  {Array}       values
   * @param  {String}       direction
   * @return {Array}
   * @private
   */
  _getDifference (files, values, direction) {
    const difference = direction === 'down' ? _.intersection(values, _.keys(files)) : _.difference(_.keys(files), values)
    _.each(difference, (file) => {
      if (typeof (files[file]) !== 'function') {
        throw new Error(`Make sure you are exporting a class from ${file}`)
      }
      this._migrateClass(new files[file](), direction)
    })
    return difference
  }

  /**
   * @description returns difference of files to be used for migrations
   * also auto sets migrations on runner instance
   * @method _diff
   * @param  {Array} files
   * @param  {Sring} direction
   * @return {Array}
   * @private
   */
  _diff (files, direction) {
    /**
     * pull all migrations from migrations table when direction
     * is up
     */
    let query = this.knex.select('name').from(this.migrationsTable).pluck('name')
    /**
     * pull only last batch migrations when direction is down
     */
    if (direction === 'down') {
      const subquery = this.knex.from(this.migrationsTable).max('batch as max_batch')
      query = this.knex.select('name').from(this.migrationsTable).where('batch', subquery).pluck('name')
    }

    return new Promise((resolve, reject) => {
      this
        ._makeMigrationsTable()
        .then(() => {
          return query
        })
        .then((values) => {
          resolve(this._getDifference(files, values, direction))
        }).catch(reject)
    })
  }

  /**
   * @description migrates a class by calling up or down
   * method on it.
   * @method _migrateClass
   * @param  {Object}      schema
   * @param  {String}      method
   * @return {void}
   * @private
   */
  _migrateClass (schema, method) {
    if (!schema[method]) {
      log.warn('skipping migration as %s is not defined', method)
      return
    }
    schema[method]()
    _.each(schema.store, (defination, name) => {
      const migration = this.knex.schema[name](defination.key, defination.callback)
      this.migrations.push(migration)
    })
  }

  /**
   * @description returns lastest batch inside migrations
   * table
   * @method _getLatestBatch
   * @param  {Object}        transaction
   * @return {Interger}
   * @private
   */
  _getLatestBatch (transaction) {
    return new Promise((resolve, reject) => {
      this.knex
        .table(this.migrationsTable)
        .transacting(transaction)
        .max('batch as max_batch')
        .then((result) => {
          const batchNumber = result[0].max_batch || 0
          resolve(batchNumber)
        }).catch(reject)
    })
  }

  /**
   * @description updates batch with all newly created
   * transactions
   * @method _updateBatch
   * @param  {Array}     difference
   * @param  {Object}     transaction
   * @return {Object}
   * @private
   */
  _updateBatch (difference, transaction) {
    return new Promise((resolve, reject) => {
      this
        ._getLatestBatch(transaction)
        .then((batchNumber) => {
          batchNumber++
          difference = _.map(difference, function (migration) {
            return {name: migration, batch: batchNumber, migration_time: new Date()}
          })
          return this.knex.table(this.migrationsTable).transacting(transaction).insert(difference)
            .then(resolve)
        }).catch(reject)
    })
  }

  /**
   * @description deletes an entire batch from migrations table, required
   * when rolling back
   * @method _deleteBatch
   * @param  {Object}     transaction
   * @return {Object}
   * @private
   */
  _deleteBatch (transaction) {
    return new Promise((resolve, reject) => {
      this
        ._getLatestBatch(transaction)
        .then((batchNumber) => {
          return this.knex.table(this.migrationsTable).transacting(transaction).where('batch', batchNumber).delete()
        })
        .then(resolve)
        .catch(reject)
    })
  }

  /**
   * @description sets up a queue of migrations to be run
   * in a sequence
   * @method _waterFallMigrations
   * @param  {Object}             transaction
   * @return {Array}
   * @private
   */
  _waterFallMigrations (transaction) {
    let result = Q()
    _.each(this.migrations, function (item) {
      item.transacting(transaction)
      result = result.then(function () {
        return item
      })
    })
    return result
  }

  /**
   * @description runs all migrations in a given
   * direction under a transaction
   * @method _run
   * @param  {Array} difference
   * @param  {String} direction
   * @return {Object}
   * @private
   */
  _run (difference, direction) {
    let finalError
    return new Promise((resolve, reject) => {
      this
        ._makeLockTable()
        .then(() => {
          return this._checkLock()
        })
        .then(() => {
          return this._addLock()
        })
        .then(() => {
          return this.knex.transaction((trx) => {
            this._waterFallMigrations(trx)
              .then(() => {
                return direction === 'down' ? this._deleteBatch(trx) : this._updateBatch(difference, trx)
              })
              .then(trx.commit)
              .catch(trx.rollback)
          })
            .then(() => {
              return this._freeLock()
            })
        })
        .then(resolve)
        .catch((error) => {
          finalError = error
          return this._freeLock()
        })
        .then(() => {
          reject(finalError)
        })
    })
  }

  /**
   * @description runs up on all new migrations
   * @method up
   * @param  {Array} files
   * @return {Object}
   * @public
   */
  up (files) {
    let migrated = []
    return new Promise((resolve, reject) => {
      this._diff(files, 'up')
        .then((difference) => {
          migrated = difference
          if (_.size(difference) > 0) {
            return this._run(difference, 'up')
          }
          return ''
        })
        .then((response) => {
          this.knex.destroy()
          const status = _.size(migrated) > 0 ? 'completed' : 'skipped'
          resolve({migrated, status})
        })
        .catch(reject)
    })
  }

  /**
   * @description runs down on all latest batch migrations
   * @method down
   * @param  {Array} files
   * @return {Object}
   * @public
   */
  down (files) {
    let migrated = []
    return new Promise((resolve, reject) => {
      this._diff(files, 'down')
        .then((difference) => {
          migrated = difference
          if (_.size(difference) > 0) {
            return this._run(difference, 'down')
          }
        })
        .then((response) => {
          this.knex.destroy()
          const status = _.size(migrated) > 0 ? 'completed' : 'skipped'
          resolve({migrated, status})
        })
        .catch(reject)
    })
  }

}

module.exports = Runner

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
const CE = require('../Exceptions')

/**
 * Migration class is used to migrate the database by
 * calling actions defined inside schema class.
 *
 * @binding Adonis/Src/Migration
 * @singleton
 * @alias Migration
 * @group Database
 * @uses (['Adonis/Src/Config', 'Adonis/Src/Database'])
 *
 * @class Migration
 * @constructor
 */
class Migration {
  constructor (Config, Database) {
    this.db = Database
    this._migrationsTable = Config.get('database.migrationsTable', 'adonis_schema')
    this._lockTable = `${this._migrationsTable}_lock`
  }

  /**
   * Makes the migrations table only if doesn't exists
   *
   * @method _makeMigrationsTable
   * @async
   *
   * @return {void}
   *
   * @private
   */
  _makeMigrationsTable () {
    return this.db.schema.createTableIfNotExists(this._migrationsTable, (table) => {
      table.increments()
      table.string('name')
      table.integer('batch')
      table.timestamp('migration_time').defaultsTo(this.db.fn.now())
    })
  }

  /**
   * Creates the lock table if it doesn't exists
   *
   * @method _makeLockTable
   * @async
   *
   * @return {void}
   *
   * @private
   */
  _makeLockTable () {
    return this.db.schema.createTableIfNotExists(this._lockTable, (table) => {
      table.increments()
      table.boolean('is_locked')
    })
  }

  /**
   * Adds lock to make sure only one migration
   * process runs at a time
   *
   * @method _addLock
   * @async
   *
   * @private
   */
  _addLock () {
    return this.db.insert({ is_locked: true }).into(this._lockTable)
  }

  /**
   * Remove the added lock
   *
   * @method _removeLock
   * @async
   *
   * @return {void}
   *
   * @private
   */
  _removeLock () {
    return this.db.schema.dropTableIfExists(this._lockTable)
  }

  /**
   * Checks for lock and throws exception if
   * lock exists
   *
   * @method _checkForLock
   * @async
   *
   * @return {void}
   *
   * @private
   */
  async _checkForLock () {
    const hasLock = await this.db
      .from(this._lockTable)
      .where('is_locked', 1)
      .orderBy('id', 'desc')
      .first()

    if (hasLock) {
      throw CE.RuntimeException.migrationsAreLocked(this._lockTable)
    }
  }

  /**
   * Returns the latest batch number. Any inserts
   * should be done by incrementing the batch
   * number
   *
   * @method _getLatestBatch
   * @async
   *
   * @return {Number}
   *
   * @private
   */
  async _getLatestBatch () {
    const batch = await this.db.table(this._migrationsTable).max('batch as batch')
    return Number(_.get(batch, '0.batch', 0))
  }

  /**
   * Add a new row to the migrations table for
   * a given batch
   *
   * @method _addForBatch
   * @async
   *
   * @param  {String}     name
   * @param  {Number}     batch
   *
   * @return {void}
   *
   * @private
   */
  _addForBatch (name, batch) {
    return this.db.table(this._migrationsTable).insert({name, batch})
  }

  /**
   * Remove row for a given schema defination from
   * the migrations table
   *
   * @method _remove
   * @async
   *
   * @param  {String} name
   *
   * @return {void}
   *
   * @private
   */
  _remove (name) {
    return this.db.table(this._migrationsTable).where('name', name).delete()
  }

  /**
   * Get all the schema definations after a batch
   * number.
   *
   * Note: This method will return all the rows when
   * batch is defined as zero
   *
   * @method _getAfterBatch
   * @async
   *
   * @param  {Number}       [batch = 0]
   *
   * @return {Array}
   *
   * @private
   */
  _getAfterBatch (batch = 0) {
    const query = this.db.table(this._migrationsTable)

    if (batch > 0) {
      query.where('batch', '>', batch)
    }

    return query.orderBy('name').pluck('name')
  }

  /**
   * Returns an array of schema names to be executed for
   * a given action.
   *
   * @method _getDiff
   *
   * @param  {Array}  names - Name of all schemas
   * @param  {String} direction - The direction for the migration
   * @param  {String} [batch]
   *
   * @return {Array}
   *
   * @private
   */
  async _getDiff (names, direction = 'up', batch) {
    const schemas = direction === 'down'
    ? await this._getAfterBatch(batch)
    : await this.db.table(this._migrationsTable).pluck('name')

    return direction === 'down' ? _.reverse(_.intersection(names, schemas)) : _.difference(names, schemas)
  }

  /**
   * Execute all schemas one by one in sequence
   *
   * @method _execute
   *
   * @param  {Object} Schemas
   * @param  {String} direction
   *
   * @return {void}
   *
   * @private
   */
  async _execute (schemas, direction, batch, toSQL) {
    for (let schema in schemas) {
      const schemaInstance = new schemas[schema](this.db)
      await schemaInstance[direction](toSQL)
      await schemaInstance.executeActions()
      direction === 'up' ? await this._addForBatch(schema, batch) : await this._remove(schema)
    }
  }

  /**
   * Clean up state by removing lock and
   * close the db connection
   *
   * @method _cleanup
   *
   * @return {void}
   */
  async _cleanup () {
    await this._removeLock()
    this.db.close()
  }

  /**
   * Migrate the database using defined schema
   *
   * @method up
   *
   * @param  {Object} schemas
   *
   * @return {Object}
   *
   * @throws {Error} If any of schema file throws exception
   */
  async up (schemas, toSQL) {
    await this._makeMigrationsTable()
    await this._makeLockTable()
    await this._checkForLock()
    await this._addLock()

    const diff = await this._getDiff(_.keys(schemas), 'up')

    /**
     * Can't do much since all is good
     */
    if (!_.size(diff)) {
      await this._cleanup()
      return { migrated: [], status: 'skipped' }
    }

    /**
     * Getting a list of filtered schemas in the correct order
     */
    const filteredSchemas = _.transform(diff, (result, name) => {
      result[name] = schemas[name]
      return name
    }, {})

    try {
      const batch = await this._getLatestBatch()
      await this._execute(filteredSchemas, 'up', batch + 1, toSQL)
      await this._cleanup()
      return { migrated: diff, status: 'completed' }
    } catch (error) {
      await this._cleanup()
      throw error
    }
  }

  /**
   * Rollback migrations to a given batch, latest
   * batch or the way upto to first batch.
   *
   * @method down
   *
   * @param  {Object} schemas
   * @param  {Number} batch
   * @param  {Boolean} toSQL
   *
   * @return {Object}
   *
   * @throws {Error} If something blows in schema file
   */
  async down (schemas, batch, toSQL = false) {
    await this._makeMigrationsTable()
    await this._makeLockTable()
    await this._checkForLock()
    await this._addLock()

    if (batch === null || typeof (batch) === 'undefined') {
      batch = await this._getLatestBatch()
      batch = batch - 1
    }

    const diff = await this._getDiff(_.keys(schemas), 'down', batch)

    /**
     * Can't do much since all is good
     */
    if (!_.size(diff)) {
      await this._cleanup()
      return { migrated: [], status: 'skipped' }
    }

    /**
     * Getting a list of filtered schemas in the correct order
     */
    const filteredSchemas = _.transform(diff, (result, name) => {
      result[name] = schemas[name]
      return name
    }, {})

    try {
      await this._execute(filteredSchemas, 'down', batch, toSQL)
      await this._cleanup()
      return { migrated: diff, status: 'completed' }
    } catch (error) {
      await this._cleanup()
      throw error
    }
  }

  /**
   * Returns the status of all the schemas
   *
   * @method status
   *
   * @param  {Object} schemas
   *
   * @return {Object}
   */
  async status (schemas) {
    const migratedFiles = await this._getAfterBatch(0)
    return _.transform(schemas, (result, schema, name) => {
      result[name] = _.includes(migratedFiles, name) ? 'Y' : 'N'
      return result
    }, {})
  }
}

module.exports = Migration

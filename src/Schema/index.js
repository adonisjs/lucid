'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')

/**
 * The schema is used to define SQL table schemas. This makes
 * use of all the methods from http://knexjs.org/#Schema
 *
 * @binding Adonis/Src/Schema
 * @alias Schema
 * @group Database
 * @uses (['Adonis/Src/Database'])
 *
 * @class Schema
 * @constructor
 */
class Schema {
  constructor (Database) {
    this.db = Database.connection(this.constructor.connection)
    this._deferredActions = []
  }

  /**
   * Connection to be used for schema
   *
   * @attribute connection
   *
   * @return {String}
   */
  static get connection () {
    return ''
  }

  /**
   * The schema instance of knex
   *
   * @attribute schema
   *
   * @return {Object}
   */
  get schema () {
    return this.db.schema
  }

  /**
   * Access to db fn
   *
   * @attribute fn
   *
   * @return {Object}
   */
  get fn () {
    return this.db.fn
  }

  /**
   * Select schema to be used with postgreSQL.
   *
   * @method withSchema
   *
   * @param {String} schema
   *
   * @chainable
   */
  withSchema (schema) {
    this.schema.withSchema(schema)
    return this
  }

  /**
   * Create a extension.
   *
   * NOTE: This action is deferred
   *
   * @method createExtension
   *
   * @param  {String}    extensionName
   *
   * @chainable
   */
  createExtension (extensionName) {
    this._deferredActions.push({ name: 'createExtension', args: [extensionName] })
    return this
  }

  /**
   * Create a extension if not already exists.
   *
   * NOTE: This action is deferred
   *
   * @method createExtensionIfNotExists
   *
   * @param  {String}    extensionName
   *
   * @chainable
   */
  createExtensionIfNotExists (extensionName) {
    this._deferredActions.push({ name: 'createExtensionIfNotExists', args: [extensionName] })
    return this
  }

  /**
   * Create a new table.
   *
   * NOTE: This action is deferred
   *
   * @method createTable
   *
   * @param  {String}    tableName
   * @param  {Function}  callback
   *
   * @chainable
   */
  createTable (tableName, callback) {
    this._deferredActions.push({ name: 'createTable', args: [tableName, callback] })
    return this
  }

  /**
   * Create a new table if not already exists.
   *
   * NOTE: This action is deferred
   *
   * @method createTableIfNotExists
   *
   * @param  {String}    tableName
   * @param  {Function}  callback
   *
   * @chainable
   */
  createTableIfNotExists (tableName, callback) {
    this._deferredActions.push({ name: 'createTableIfNotExists', args: [tableName, callback] })
    return this
  }

  /**
   * Rename existing table.
   *
   * NOTE: This action is deferred
   *
   * @method renameTable
   *
   * @param  {String}    fromTable
   * @param  {String}    toTable
   *
   * @chainable
   */
  renameTable (fromTable, toTable) {
    this._deferredActions.push({ name: 'renameTable', args: [fromTable, toTable] })
    return this
  }

  /**
   * Drop existing extension.
   *
   * NOTE: This action is deferred
   *
   * @method dropExtension
   *
   * @param  {String}    extensionName
   *
   * @chainable
   */
  dropExtension (extensionName) {
    this._deferredActions.push({ name: 'dropExtension', args: [extensionName] })
    return this
  }

  /**
   * Drop extension only if it exists.
   *
   * NOTE: This action is deferred
   *
   * @method dropExtensionIfExists
   *
   * @param  {String}    extensionName
   *
   * @chainable
   */
  dropExtensionIfExists (extensionName) {
    this._deferredActions.push({ name: 'dropExtensionIfExists', args: [extensionName] })
    return this
  }

  /**
   * Drop existing table.
   *
   * NOTE: This action is deferred
   *
   * @method dropTable
   *
   * @param  {String}    tableName
   *
   * @chainable
   */
  dropTable (tableName) {
    this._deferredActions.push({ name: 'dropTable', args: [tableName] })
    return this
  }

  /**
   * Drop table only if it exists.
   *
   * NOTE: This action is deferred
   *
   * @method dropTableIfExists
   *
   * @param  {String}    tableName
   *
   * @chainable
   */
  dropTableIfExists (tableName) {
    this._deferredActions.push({ name: 'dropTableIfExists', args: [tableName] })
    return this
  }

  /**
   * Select table for altering it.
   *
   * NOTE: This action is deferred
   *
   * @method table
   *
   * @param  {String}    tableName
   * @param  {Function}  callback
   *
   * @chainable
   */
  table (tableName, callback) {
    this._deferredActions.push({ name: 'table', args: [tableName, callback] })
    return this
  }

  /* istanbul ignore next */
  /**
   * Run a raw SQL statement
   *
   * @method raw
   *
   * @param  {String} statement
   *
   * @return {Object}
   */
  raw (statement) {
    this._deferredActions.push({ name: 'raw', args: [statement] })
    return this
  }

  /**
   * Schedule a method to be executed in sequence with migrations
   *
   * @method schedule
   *
   * @param  {Function} fn
   *
   * @chainable
   */
  schedule (fn) {
    if (typeof (fn) !== 'function') {
      throw GE.InvalidArgumentException.invalidParameter(`this.schedule expects 1st argument to be a function`)
    }
    this._deferredActions.push({ name: 'schedule', args: [fn] })
    return this
  }

  /**
   * Returns a boolean indicating if a table
   * already exists or not
   *
   * @method hasTable
   *
   * @param  {String}  tableName
   *
   * @return {Boolean}
   */
  hasTable (tableName) {
    return this.schema.hasTable(tableName)
  }

  /* istanbul ignore next */
  /**
   * Returns a boolean indicating if a column exists
   * inside a table or not.
   *
   * @method hasColumn
   *
   * @param  {String}  tableName
   * @param  {String}  columnName
   *
   * @return {Boolean}
   */
  hasColumn (tableName, columnName) {
    return this.schema.hasTable(tableName, columnName)
  }

  /**
   * Alias for @ref('Schema.table')
   *
   * @method alter
   */
  alter (...args) {
    return this.table(...args)
  }

  /**
   * Alias for @ref('Schema.createTable')
   *
   * @method create
   */
  create (...args) {
    return this.createTable(...args)
  }

  /**
   * Alias for @ref('Schema.createTableIfNotExists')
   *
   * @method createIfNotExists
   */
  createIfNotExists (...args) {
    return this.createTableIfNotExists(...args)
  }

  /**
   * Alias for @ref('Schema.dropTable')
   *
   * @method drop
   */
  drop (...args) {
    return this.dropTable(...args)
  }

  /**
   * Alias for @ref('Schema.dropTableIfExists')
   *
   * @method dropIfExists
   */
  dropIfExists (...args) {
    return this.dropTableIfExists(...args)
  }

  /**
   * Alias for @ref('Schema.renameTable')
   *
   * @method rename
   */
  rename (...args) {
    return this.renameTable(...args)
  }

  /**
   * Execute deferred actions in sequence. All the actions will be
   * wrapped inside a transaction, which get's rolled back on
   * error.
   *
   * @method executeActions
   *
   * @param {Boolean} [getSql = false] Get sql for the actions over executing them
   *
   * @return {Array}
   */
  async executeActions (getSql = false) {
    /**
     * Returns SQL array over executing the actions
     */
    if (getSql) {
      return this._deferredActions.map((action) => {
        return this.schema[action.name](...action.args).toString()
      })
    }

    const trx = await this.db.beginTransaction()
    for (let action of this._deferredActions) {
      try {
        if (action.name === 'schedule') {
          await action.args[0](trx)
        } else {
          await trx.schema[action.name](...action.args)
        }
      } catch (error) {
        trx.rollback()
        throw error
      }
    }
    trx.commit()
    this._deferredActions = []
    return [] // just to be consistent with the return output
  }
}

module.exports = Schema

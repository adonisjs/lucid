'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * The schema is used to define SQL table schemas. This makes
 * use of all the methods from http://knexjs.org/#Schema
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
    return this.schema.raw(statement)
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
}

module.exports = Schema

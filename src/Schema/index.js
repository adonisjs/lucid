'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const SchemaChain = require('./chain')

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
    this._chains = []
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
    return this.schema.hasColumn(tableName, columnName)
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
      return this._chains.map((chain) => chain.toString(this.schema))
    }

    /**
     * We need one transaction per class, so we start it here, instead of
     * doing it inside the `for of` loop.
     */
    const trx = await this.db.beginTransaction()

    /**
     * Execute all the chains
     */
    for (let chain of this._chains) {
      await chain.execute(trx)
    }

    /**
     * Finally commit the transaction
     */
    trx.commit()

    return []
  }
}

/**
 * Copying all the chain method to the Schema prototype.
 */
Object
  .getOwnPropertyNames(SchemaChain.prototype)
  .filter((method) => method !== 'constructor')
  .forEach((method) => {
    Schema.prototype[method] = function (...args) {
      const chain = new SchemaChain()
      chain[method](...args)
      this._chains.push(chain)
      return chain
    }
  })

module.exports = Schema

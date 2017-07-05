'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')
const proxyGet = require('../../lib/proxyGet')

class Schema {
  constructor () {
    this.db = ioc.use('Adonis/Src/Database').connection(this.constructor.connection)
    return new Proxy(this, {
      get: proxyGet('schema', true)
    })
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
   * Alias for `createTable`
   *
   * @method create
   *
   * @param  {String}   table
   * @param  {Function} callback
   *
   * @return {Promise}
   */
  create (table, callback) {
    return this.schema.createTable(table, callback)
  }

  /**
   * Alias for `dropTable`
   *
   * @method drop
   *
   * @param  {String} table
   *
   * @return {Promise}
   */
  drop (table) {
    return this.schema.dropTable(table)
  }
}

module.exports = Schema

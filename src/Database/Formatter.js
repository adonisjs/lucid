'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const KnexFormatter = require('knex/lib/formatter')

/**
 * Database formatter class overrids `compileCallback` function
 * from Knex formatter to make use of the subquery when it
 * exists.
 *
 * @class DatabaseFormatter
 */
class DatabaseFormatter extends KnexFormatter {
  constructor (client, builder) {
    super(client)
    this.builder = builder
  }

  /**
   * Exactly copied from KnexFormatter, but instead passed
   * Lucid query builder over passing the knex query
   * builder to the `where` callback
   *
   * @method compileCallback
   *
   * @param  {Function}      callback
   * @param  {String}        method
   *
   * @return {Object}
   */
  compileCallback (callback, method) {
    /**
     * subQuery is set by Lucid model query builder, since that querybuilder
     * has more methods then a regular query builder.
     */
    const builder = typeof (this.builder.subQuery) === 'function'
      ? this.builder.subQuery()
      : this.client.queryBuilder()

    /**
     * All this code is a copy/paste from Knex
     */
    callback.call(builder, builder)
    const compiler = this.client.queryCompiler(builder)
    compiler.formatter = this

    return compiler.toSQL(method || builder._method || 'select')
  }
}

module.exports = DatabaseFormatter

'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const cf = require('co-functional')
const _ = require('lodash')
const Ioc = require('adonis-fold').Ioc
const fake = require('./fake')

class DatabaseFactory {

  constructor (binding, callback) {
    this.dbTable = binding
    this.callback = callback
    this.binding = Ioc.use('Adonis/Src/Database')
    this.returningField = 'id'
  }

  /**
   * calls blueprint and passed fake instance
   * to it.
   *
   * @param {Number} iterator
   * @param {Mixed} values
   *
   * @return {Object}
   *
   * @private
   */
  _callBlueprint (iterator, values) {
    return this.callback(fake, iterator, values)
  }

  /**
   * sets table name to be used by the query
   * builder
   *
   * @param  {String} tableName
   * @return {Object}           reference to this
   *
   * @public
   */
  table (tableName) {
    this.dbTable = tableName
    return this
  }

  /**
   * defines the returning field to be used
   * when doing insert statement
   *
   * @param  {String}  field
   * @return {Object}        reference to this
   *
   * @public
   */
  returning (field) {
    this.returningField = field
    return this
  }

  /**
   * creates rows inside the database by calling insert
   * method on database query builder
   *
   * @method create
   *
   * @param  {Number} rows
   * @param {Mixed} values
   *
   * @return {Arrays}      Array of inserted ids
   *
   * @public
   */
  * create (rows, values) {
    const self = this
    this.binding = this.binding.table(this.dbTable)
    rows = rows || 1
    const range = _.range(rows)
    const ids = yield cf.mapSerial(function * (iterator) {
      return yield self.binding.insert(self._callBlueprint(iterator + 1, values)).returning(self.returningField)
    }, range)
    return _.flatten(ids)
  }

  /**
   * will reset the given table by calling
   * truncate method on it.
   *
   * @return {Number}
   *
   * @public
   */
  reset () {
    return this.binding.truncate()
  }
}

module.exports = DatabaseFactory

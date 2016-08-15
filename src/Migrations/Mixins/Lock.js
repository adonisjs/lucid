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
const CE = require('../../Exceptions')
const Lock = exports = module.exports = {}

/**
 * makes a new lock table if does not exists already
 *
 * @return {Object}
 *
 * @private
 */
Lock._makeLockTable = function () {
  return this.database.schema
    .createTableIfNotExists(this.lockTable, function (table) {
      table.increments('id')
      table.boolean('is_locked')
    })
}

/**
 * adds a lock on migrations
 *
 * @private
 */
Lock._addLock = function () {
  return this.database.insert({is_locked: 1}).into(this.lockTable)
}

/**
 * checks whether there is a lock on
 * migrations table or not.
 *
 * @return {Object}
 *
 * @private
 */
Lock._checkLock = function * () {
  const result = yield this.database
    .from(this.lockTable)
    .where('is_locked', 1)
    .orderBy('id', 'desc')
    .limit(1)

  if (_.size(result)) {
    throw CE.RuntimeException.migrationsAreLocked(this.lockTable)
  }
  return false
}

/**
 * removes migrations lock by drop the
 * lock table
 *
 * @return {Object}
 *
 * @private
 */
Lock._deleteLock = function * () {
  return this.database.schema.dropTable(this.lockTable)
}

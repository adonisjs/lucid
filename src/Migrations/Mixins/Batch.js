'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Batch = exports = module.exports = {}

/**
 * returns recent batch number to be used for rollback
 *
 * @yield {Number}
 *
 * @private
 */
Batch._getRecentBatchNumber = function * () {
  const result = yield this.database.from(this.migrationsTable).max('batch as batch')
  const batchNumber = result[0].batch || 1
  return Number(batchNumber) - 1
}

/**
 * returns next batch number to be used for storing
 * progress
 *
 * @yield {Number}
 *
 * @private
 */
Batch._getNextBatchNumber = function * () {
  const result = yield this.database.table(this.migrationsTable).max('batch as batch')
  const batchNumber = result[0].batch || 0
  return Number(batchNumber) + 1
}

/**
 * updates batch with all newly created
 * migrations
 *
 * @param  {Array}     migrations
 * @yield {Number}
 *
 * @private
 */
Batch._updateProgress = function * (migration, batchNumber) {
  const migrations = {name: migration, batch: batchNumber, migration_time: new Date()}
  return yield this.database.table(this.migrationsTable).insert(migrations)
}

/**
 * deletes batch row from migrations table, required
 * when rolling back
 *
 * @yield {Object}
 *
 * @private
 */
Batch._revertProgress = function * (file, batchNumber) {
  return yield this.database.table(this.migrationsTable).where('name', file).delete()
}

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

const Batch = exports = module.exports = {}

/**
 * returns lastest batch inside migrations
 * table
 *
 * @method _getLatestBatch
 *
 * @return {Number}
 *
 * @private
 */
Batch._getLatestBatch = function * () {
  const result = yield this.database.table(this.migrationsTable).max('batch as batch')
  const batchNumber = result[0].batch || 0
  return batchNumber
}

/**
 * updates batch with all newly created
 * migrations
 *
 * @method _incrementBatch
 *
 * @param  {Array}     migrations
 * @return {Object}
 *
 * @private
 */
Batch._incrementBatch = function * (migrations) {
  let batchNumber = yield this._getLatestBatch()
  batchNumber++
  migrations = _.map(migrations, function (migration) {
    return {name: migration, batch: batchNumber, migration_time: new Date()}
  })
  return yield this.database.table(this.migrationsTable).insert(migrations)
}

/**
 * deletes batch row from migrations table, required
 * when rolling back
 *
 * @method _deleteBatch
 *
 * @return {Object}
 *
 * @private
 */
Batch._deleteBatch = function * () {
  const batchNumber = yield this._getLatestBatch()
  return yield this.database.table(this.migrationsTable).where('batch', batchNumber).delete()
}

/**
 * this query sets dynamic where clause to select the
 * given batch. When batch number is defined it will
 * use the batch number otherwise it will make use
 * of subquery
 *
 * @method _dynamicBatchQuery
 *
 * @param  {Object}          builder
 * @param  {Number}          batch
 *
 * @private
 */
Batch._dynamicBatchQuery = function (builder, subquery, batch) {
  if (batch === 0 || batch) {
    builder.where('batch', '>', batch)
  } else {
    builder.where('batch', subquery)
  }
}

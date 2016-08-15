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
const CE = require('../../../Exceptions')
const Peristance = exports = module.exports = {}

/**
 * inserts instance values to the database and sets instance
 * primary key value
 *
 * @method insert
 *
 * @return {Boolean}
 *
 * @public
 */
Peristance.insert = function * () {
  /**
   * insert handler is sent to hooks execution method
   * and will be called there itself.
   */
  const insertHandler = function * () {
    const values = this.attributes
    if (!values || _.size(values) < 1) {
      throw CE.ModelException.invalidState(`Cannot save empty ${this.constructor.name} model`)
    }
    const query = this.constructor.query()
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const save = yield query.insertAttributes(values).returning(this.constructor.primaryKey)
    if (save[0]) {
      this.$primaryKeyValue = save[0]
      this.original = _.clone(this.attributes)
    }
    return !!save
  }
  return yield this.executeInsertHooks(this, insertHandler)
}

/**
 * updates model dirty values
 *
 * @method update
 *
 * @return {Number} - number of affected rows after update
 *
 * @public
 */
Peristance.update = function * () {
  /**
   * update handler is sent to hooks execution method
   * and will be called there itself.
   */
  const updateHandler = function * () {
    const query = this.constructor.query()
    const dirtyValues = this.$dirty
    if (!_.size(dirtyValues)) {
      return 0
    }
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const affected = yield query.where('id', this.$primaryKeyValue).updateAttributes(dirtyValues)
    if (affected > 0) {
      _.merge(this.attributes, dirtyValues)
      this.original = _.clone(this.attributes)
    }
    return affected
  }
  return yield this.executeUpdateHooks(this, updateHandler)
}

/**
 * deletes a given model row from database. However if soft deletes are
 * enabled, it will update the deleted at timestamp
 *
 * @method delete
 *
 * @return {Number} - Number of affected rows
 *
 * @public
 */
Peristance.delete = function * () {
  const deleteHandler = function * () {
    const query = this.constructor.query().where('id', this.$primaryKeyValue)
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const values = {}
    const affected = yield query.deleteAttributes(values)
    if (affected > 0) {
      _.merge(this.attributes, values)
      this.freeze()
    }
    return affected
  }
  return yield this.executeDeleteHooks(this, deleteHandler)
}

/**
 * restores a soft deleted model instance
 * @method *restore
 *
 * @return {Number} - Number of affected rows
 *
 * @public
 */
Peristance.restore = function * () {
  const restoreHandler = function * () {
    const query = this.constructor.query().where('id', this.$primaryKeyValue)
    if (this.transaction) {
      query.transacting(this.transaction)
    }
    const values = {}
    const affected = yield query.restoreAttributes(values)
    if (affected > 0) {
      this.unfreeze()
      _.merge(this.attributes, values)
    }
    return affected
  }
  return yield this.executeRestoreHooks(this, restoreHandler)
}

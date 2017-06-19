'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const BaseRelation = require('./BaseRelation')
const CE = require('../../Exceptions')

class HasOne extends BaseRelation {
  constructor (parentInstance, relatedModel, primaryKey, foreignKey) {
    super(parentInstance, relatedModel, primaryKey, foreignKey)
  }

  /**
   * Returns the value for the primary key set on
   * the relationship
   *
   * @method $primaryKeyValue
   *
   * @return {Mixed}
   */
  get $primaryKeyValue () {
    return this.parentInstance[this.primaryKey]
  }

  /**
   * Decorates the query instance with the required where
   * clause. This method should be called internally by
   * all read/update methods.
   *
   * @method _decorateQuery
   *
   * @return {void}
   *
   * @private
   */
  _decorateQuery () {
    this.query.where(this.foreignKey, this.$primaryKeyValue)
  }

  /**
   * Validates the read operation
   *
   * @method _validateRead
   *
   * @return {void}
   *
   * @throws {RuntimeException} If parent model is not persisted
   */
  _validateRead () {
    if (!this.$primaryKeyValue || !this.parentInstance.$persisted) {
      throw CE.RuntimeException.unSavedModel(this.parentInstance.constructor.name)
    }
  }

  /**
   * Load a single relationship from parent to child
   * model, but only for one row
   *
   * @method load
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   */
  load () {
    return this.query.where(this.foreignKey, this.$primaryKeyValue).first()
  }

  /**
   * Eagerload a single relationship from parent to child
   * model
   *
   * @method eagerLoad
   *
   * @param  {Array}  values
   *
   * @return {Collection}
   */
  eagerLoad (values) {
    return this.query.whereIn(this.foreignKey, values).fetch()
  }

  /**
   * Fetch related rows for a relationship
   *
   * @method fetch
   *
   * @alias first
   *
   * @return {Model}
   */
  fetch () {
    return this.first()
  }

  /**
   * Returns the first row for the relationship
   *
   * @method first
   *
   * @return {Model}
   */
  first () {
    this._validateRead()
    this._decorateQuery()
    return this.query.first()
  }
}

module.exports = HasOne

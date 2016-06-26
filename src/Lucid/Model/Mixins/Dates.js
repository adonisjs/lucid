'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Dates = exports = module.exports = {}
const moment = require('moment')

/**
 * sets create timestamp on an object of values only
 * if create timestamps are enabled by a given
 * model.
 *
 * @method setCreateTimestamp
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
Dates.setCreateTimestamp = function (values) {
  if (this.constructor.createTimestamp) {
    values[this.constructor.createTimestamp] = moment().format(this.constructor.dateFormat)
  }
  return values
}

/**
 * sets update timestamp on an object of values only
 * if update timestamps are enabled by a given
 * model.
 *
 * @method setUpdateTimestamp
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
Dates.setUpdateTimestamp = function (values) {
  if (this.constructor.updateTimestamp) {
    values[this.constructor.updateTimestamp] = moment().format(this.constructor.dateFormat)
  }
  return values
}

/**
 * sets delete timestamp on an object of values only
 * if delete timestamps are enabled by a given
 * model.
 *
 * @method setDeleteTimestamp
 *
 * @param  {Object}           values
 * @return {Object}
 *
 * @public
 */
Dates.setDeleteTimestamp = function (values) {
  if (this.constructor.deleteTimestamp) {
    values[this.constructor.deleteTimestamp] = moment().format(this.constructor.dateFormat)
  }
  return values
}

/**
 * sets the delete timestamp to null
 *
 * @method setRestoreTimestamp
 *
 * @param  {Object}            values
 * @return {Object}
 *
 * @public
 */
Dates.setRestoreTimestamp = function (values) {
  values[this.constructor.deleteTimestamp] = null
  return values
}

/**
 * returns getter method names for a given timestamp
 * field.
 *
 * @method getTimestampKey
 *
 * @param  {String}        fieldName
 * @return {String}
 *
 * @example
 * field      -> getter
 * created_at -> createTimestamp
 *
 * @public
 */
Dates.getTimestampKey = function (fieldName) {
  if (fieldName === this.constructor.createTimestamp) {
    return 'createTimestamp'
  }
  if (fieldName === this.constructor.updateTimestamp) {
    return 'updateTimestamp'
  }
  if (fieldName === this.constructor.deleteTimestamp) {
    return 'deleteTimestamp'
  }
}

/**
 * formats a given date with the defined dateFormat
 * for a model instance.
 *
 * @method formatDate
 *
 * @param  {String}   date
 * @return {String}
 *
 * @public
 */
Dates.formatDate = function (date) {
  return moment(date).isValid() ? moment(date).format(this.constructor.dateFormat) : date
}

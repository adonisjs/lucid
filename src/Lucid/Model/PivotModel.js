'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const moment = require('moment')
const _ = require('lodash')
const BaseModel = require('./Base')

class PivotModel extends BaseModel {
  /**
   * Perform required actions to newUp the model instance. This
   * method does not call setters since it is supposed to be
   * called after `fetch` or `find`.
   *
   * @method newUp
   *
   * @param  {Object} row
   *
   * @return {void}
   */
  newUp (row) {
    this.$persisted = true
    this.$attributes = row
    if (this.$attributes.created_at) {
      this.$attributes.created_at = moment(this.$attributes.created_at)
    }

    if (this.$attributes.updated_at) {
      this.$attributes.updated_at = moment(this.$attributes.created_at)
    }

    this.$frozen = true
  }

  /**
   * Converts model to an object. This method will call getters,
   * cast dates and will attach `computed` properties to the
   * object.
   *
   * @method toObject
   *
   * @return {Object}
   */
  toObject () {
    return _.transform(this.$attributes, (result, value, key) => {
      /**
       * If value is an instance of moment and there is no getter defined
       * for it, then cast it as a date.
       */
      if (value instanceof moment) {
        result[key] = this.constructor.castDates(key, value)
      } else {
        result[key] = value
      }
      return result
    }, {})
  }
}

module.exports = PivotModel

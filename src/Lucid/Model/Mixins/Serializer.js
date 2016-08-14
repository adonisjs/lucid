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
const Serializer = exports = module.exports = {}

/**
 * transforms current model data by calling getters
 * on top of them and returns an object.
 *
 * @return {Object}
 *
 * @public
 */
Serializer.toJSON = function () {
  const removeSafeFields = (values) => {
    return _.size(this.constructor.visible) ? this.pickVisible(values) : this.omitHidden(values)
  }
  return _(this.attributes)
  .thru(removeSafeFields)
  .transform((result, value, key) => {
    result[key] = this[key]
  })
  .merge(this.initializeComputedProperties())
  .merge(this.serializeRelations())
  .value()
}

/**
 * here we call toJSON on all eagerly loaded relations.
 *
 * @method serializeRelations
 *
 * @return {Object}
 *
 * @public
 */
Serializer.serializeRelations = function () {
  return _.transform(this.relations, function (result, value, index) {
    result[index] = _.size(value) && value.toJSON() ? value.toJSON() : value
  })
}

/**
 * returns values for only visible fields defined on the model
 *
 * @method pickVisible
 *
 * @param  {Object}    values
 * @return {Object}
 *
 * @public
 */
Serializer.pickVisible = function (values) {
  return _.pick(values, this.constructor.visible)
}

/**
 * returns values for all fields apart from hidden fields
 * defined on the model
 *
 * @method omitHidden
 *
 * @param  {Object}    values
 * @return {Object}
 *
 * @public
 */
Serializer.omitHidden = function (values) {
  return _.omit(values, this.constructor.hidden)
}

/**
 * parse json by calling all setter methods on model
 * to mutate their actual value and set them on
 * model instance attributes property.
 *
 * @param {Object} values
 *
 * @public
 */
Serializer.setJSON = function (values) {
  _.each(values, (value, key) => {
    this.attributes[key] = this.mutateProperty(key, value)
  })
}

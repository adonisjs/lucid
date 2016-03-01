'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const util = require('../../../../lib/util')
const CatLog = require('cat-log')
const _ = require('lodash')
const logger = new CatLog('adonis:lucid')
const AccessortMutator = exports = module.exports = {}

/**
 * accessors will call model instance getters and
 * returns transformed value.
 *
 * @method mutateProperty
 *
 * @param  {String}       property
 * @param  {Mixed}       value
 * @return {Mixed}
 *
 * @public
 */
AccessortMutator.accessProperty = function (property, value) {
  const getter = util.makeGetterName(property)
  if (typeof (this[getter]) === 'function') {
    value = this[getter](value)
  }
  return value
}

/**
 * computed properties are defined as an array, which are supposed
 * to have equivalent accessors. Here we initialize them with
 * by calling their getter methods.
 *
 * @method initializeComputedProperties
 *
 * @return {Object}
 *
 * @public
 */
AccessortMutator.initializeComputedProperties = function () {
  return _.fromPairs(_.map(this.constructor.computed, (property) => {
    const getter = util.makeGetterName(property)
    if (typeof (this[getter]) === 'function') {
      return [property, this[getter]()]
    }
    logger.warn(`You have defined ${property} as a computed property, but there is not equivalent getter method defined for same.`)
    return []
  }))
}

/**
 * mutate property calls model instance setters and
 * returns transformed value
 *
 * @method mutateProperty
 *
 * @param  {String}       property
 * @param  {Mixed}       value
 * @return {Mixed}
 *
 * @public
 */
AccessortMutator.mutateProperty = function (property, value) {
  const setter = util.makeSetterName(property)
  if (typeof (this[setter]) === 'function') {
    value = this[setter](value)
  }
  return value
}

'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = exports = module.exports = {}
const CE = require('../../Exceptions')
const targetProperties = ['$primaryKeyValue', 'original', 'attributes', 'relations', 'eagerLoad', 'frozen', 'transaction']

/**
 * proxy handler for getting target properties.Here
 * target is the model instance
 *
 * @method get
 *
 * @param  {Object} target
 * @param  {String} name
 * @return {Mixed}
 *
 * @private
 */
proxyHandler.get = function (target, name) {
  /**
   * if value exists on the model instance, we return
   * it right away.
   */
  if (target[name] !== undefined) {
    return target[name]
  }

  /**
   * otherwise we look into the attributes and return
   * value for a given attribute.
   */
  if (target.attributes[name] !== undefined) {
    const timestampKey = target.getTimestampKey(name)
    if (timestampKey) {
      /**
       * if the getter field name belongs to a timestamp, then we call
       * the timestamp getter on that fields value. Little tricky
       * but it works great.
       */
      return target.accessProperty(timestampKey, target.attributes[name])
    }
    return target.accessProperty(name, target.attributes[name])
  }
}

/**
 * proxy setter methods on target object.Here target is
 * the model instance
 *
 * @method set
 *
 * @param  {Object} target
 * @param  {String} name
 * @param  {Mixed} value
 *
 * @private
 */
proxyHandler.set = function (target, name, value) {
  if (target.isDeleted() && name !== 'frozen') {
    throw CE.ModelException.invalidState('Cannot edit a frozen model')
  }
  if (targetProperties.indexOf(name) > -1) {
    target[name] = value
    return true
  }
  target.attributes[name] = target.mutateProperty(name, value)
  return true
}

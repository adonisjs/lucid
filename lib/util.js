'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const _ = require('lodash')
const pluralize = require('pluralize')

const util = exports = module.exports = {}

/**
 * Makes the table name from the model name
 *
 * @method makeTableName
 *
 * @param  {String}      modelName
 *
 * @return {String}
 */
util.makeTableName = (modelName) => _.snakeCase(pluralize(modelName))

/**
 * Makes the setter name for a given field name
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.getSetterName = (fieldName) => `set${_.upperFirst(_.camelCase(fieldName))}`

/**
 * Makes the getter name for a given field name
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.getGetterName = (fieldName) => `get${_.upperFirst(_.camelCase(fieldName))}`

/**
 * Makes the scope name for a given field.
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.makeScopeName = (fieldName) => `scope${_.upperFirst(fieldName)}`

/**
 * Makes the foreignkey for the a given model name
 *
 * @method
 *
 * @param  {String} fieldName
 *
 * @return {String}
 */
util.makeForeignKey = (fieldName) => `${_.snakeCase(pluralize.singular(fieldName))}_id`

/**
 * Returns the event name and cycle for a given event
 *
 * @method
 *
 * @param  {String} eventName
 *
 * @return {Array}
 */
util.getCycleAndEvent = (eventName) => {
  const tokens = eventName.match(/^(before|after)(\w+)/)

  if (!tokens) {
    return []
  }

  return [ tokens[1], tokens[2].toLowerCase() ]
}

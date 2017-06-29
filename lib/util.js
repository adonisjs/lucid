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

util.makeTableName = function (name) {
  return _.snakeCase(pluralize(name))
}

util.getSetterName = function (name) {
  return `set${_.upperFirst(_.camelCase(name))}`
}

util.getGetterName = function (name) {
  return `get${_.upperFirst(_.camelCase(name))}`
}

util.makeScopeName = function (name) {
  return `scope${_.upperFirst(name)}`
}

util.makeForeignKey = function (name) {
  return `${_.snakeCase(pluralize.singular(name))}_id`
}

util.getCycleAndEvent = function (name) {
  const tokens = name.match(/^(before|after)(\w+)/)
  if (!tokens) {
    return []
  }

  return [ tokens[1], tokens[2].toLowerCase() ]
}

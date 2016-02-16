'use strict'

/**
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const i = require('inflect')
const _ = require('lodash')
const util = exports = module.exports = {}

/**
 * makes table name from a class defination
 *
 * @method makeTableName
 *
 * @param  {Object}      Model
 * @return {String}
 *
 * @public
 */
util.makeTableName = function (Model) {
  let modelName = Model.name
  modelName = i.pluralize(modelName)
  return i.underscore(modelName)
}

/**
 * makes a foreign key from a class
 * defination
 *
 * @method makeForeignKey
 * @param  {Object}       Model
 * @return {String}
 *
 * @public
 */
util.makeForeignKey = function (Model) {
  let modelName = Model.name
  modelName = i.singularize(modelName)
  return `${i.underscore(modelName)}_id`
}

/**
 * omits key/values pairs from an objec
 * @method omit
 *
 * @param  {Object} values
 * @param  { valuesToOmit
 * @return {Array|Object}
 *
 * @public
 */
util.omit = function (values, valuesToOmit) {
  return _.omit(values, valuesToOmit)
}

/**
 * pick key/values pairs from an object
 *
 * @method pick
 * @param  {Object} values
 * @param  {Array} valuesToOmit
 * @return {Object}
 *
 * @public
 */
util.pick = function (values, valuesToOmit) {
  return _.pick(values, valuesToOmit)
}

/**
 * wraps an object into lodash collection
 *
 * @method toCollection
 * @param  {Array|Object}     values
 * @return {Array|Object}
 *
 * @public
 */
util.toCollection = function (values) {
  return _(values)
}

/**
 * makes a getter name for a given field
 *
 * @method makeGetterName
 * @param  {String}       name
 * @return {String}
 *
 * @public
 */
util.makeGetterName = function (name) {
  return `get${i.camelize(i.underscore(name))}`
}

/**
 * makes a getter name for a given field
 *
 * @method makeSetterName
 * @param  {String}       name
 * @return {String}
 *
 * @public
 */
util.makeSetterName = function (name) {
  return `set${i.camelize(i.underscore(name))}`
}

/**
 * map values for a given key and returns
 * the transformed array with that key only
 *
 * @method mapValuesForAKey
 * @param  {Array}         values
 * @param  {String}         key
 * @return {Array}
 *
 * @public
 */
util.mapValuesForAKey = function (values, key) {
  return _.map(values, function (value) {
    return value[key]
  })
}

/**
 * calculates offset for a given page using
 * page and perPage options
 *
 * @method returnOffset
 * @param  {Number}     page
 * @param  {Number}     perPage
 * @return {Number}
 *
 * @public
 */
util.returnOffset = function (page, perPage) {
  return page === 1 ? 0 : ((perPage * (page - 1)))
}

/**
 * validates a page to be a number and greater
 * than 0. this is something required to paginate results.
 *
 * @method validatePage
 * @param  {Number}     page
 * @return {void}
 * @throws {Error} If page is not a number of less than 1
 *
 * @public
 */
util.validatePage = function (page) {
  if (typeof (page) !== 'number') {
    throw new Error('page parameter is required to paginate results')
  }
  if (page < 1) {
    throw new Error('cannot paginate results for page less than 1')
  }
}

/**
 * make meta data for paginated results.
 *
 * @method makePaginateMeta
 *
 * @param  {Number}         total
 * @param  {Number}         page
 * @param  {Number}         perPage
 * @return {Object}
 *
 * @public
 */
util.makePaginateMeta = function (total, page, perPage) {
  const resultSet = {
    total: total,
    currentPage: page,
    perPage: perPage,
    lastPage: 0,
    data: []
  }
  if (total > 0) {
    resultSet.lastPage = Math.ceil(total / perPage)
  }
  return resultSet
}

/**
 * capitalizes a given string
 *
 * @method capitalize
 * @param {String} value
 * @return {String}
 *
 * @public
 */
util.capitalize = i.capitalize

'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const helpers = exports = module.exports = {}
const cf = require('co-functional')
const util = require('../../../lib/util')
const _ = require('lodash')
const NE = require('node-exceptions')
class ModelRelationNotFound extends NE.LogicalException {}

/**
 * here we eagerload all the relations and take neccessary
 * steps to pass nested relations to appropriate models.
 *
 * @method eagerLoadAndMap
 *
 * @param  {Array}        results
 * @param  {Object}        eagerLoad
 * @param  {Object}        parent
 * @return {Object}
 *
 * @public
 */
helpers.eagerLoadAndMap = function (results, eagerLoad, parent) {
  /**
   * mapped keys will store the relation key and it's corresponding
   * toKey.
   * @type {Object}
   */
  const mappedKeys = {}

  /**
   * mappedKeys values will have values for a give toKey. It is better to
   * save these values, so that we are not fetching them from original
   * values everytime.
   * @type {Object}
   */
  const mappedKeysValues = {}

  const result = cf.map(function * (relation) {
    const relationInstance = helpers.getRelationInstance(relation, parent)
    const relationScope = eagerLoad.relationScopes[relation]
    const values = helpers.getPrimaryKeyValues(mappedKeys, mappedKeysValues, relation, relationInstance, results)

    /**
     * passing nested relations and scopes to the relationInstance
     */
    helpers.passNestedRelations(relationInstance, eagerLoad.nestedRelations, relation)
    helpers.passNestedScopes(relationInstance, eagerLoad.nestedScopes, relation)

    return yield relationInstance.eagerLoad(values, relationScope)
  }, eagerLoad.relations)

  return {values: result, keys: mappedKeys}
}

/**
 * here we add eagerly loaded models to a single model instance.
 *
 * @method populateRelationValues
 *
 * @param  {Object}               parent
 * @param  {Object}               eagerHash
 * @param  {Object}               row
 *
 * @example
 * accounts = [...]
 * profile = [...]
 * row = {id: 1}
 * finalResult will be
 * row = {id: 1, accounts: [...], profile: [...]}
 *
 * @public
 */
helpers.populateRelationValues = function (parent, eagerLoadResult, row) {
  if (_.size(eagerLoadResult)) {
    const keys = eagerLoadResult.keys
    const values = eagerLoadResult.values
    const relationsArray = Object.keys(keys)

    _.each(values, function (value, index) {
      const relationKey = relationsArray[index]
      const fromKey = keys[relationKey]
      parent.relations[relationKey] = value[row[fromKey]] || null
    })
  }
}

/**
 * here we return/cache values for primary keys for every single relation.
 * It is quite possible that a relation on parent model is related to
 * a different model with different foriegn keys everytime.
 *
 * @method getPrimaryKeyValues
 *
 * @param  {Object}            mappedKeys
 * @param  {Object}            mappedKeysValues
 * @param  {String}            relationKey
 * @param  {Object}            relationInstance
 * @param  {Array}             values
 * @return {Array}
 * @public
 */
helpers.getPrimaryKeyValues = function (mappedKeys, mappedKeysValues, relationKey, relationInstance, values) {
  if (!mappedKeys[relationKey]) {
    mappedKeys[relationKey] = relationInstance.fromKey
    mappedKeysValues[relationKey] = values.map((value) => value[relationInstance.fromKey])
  }
  return mappedKeysValues[relationKey]
}

/**
 * returns relation instance for a given relation key. Here we simply
 * call the relation function on the parent model and that returns
 * the relationInstance back to us.
 *
 * @method getRelationInstance
 *
 * @param  {String}            relationKey
 * @param  {Object}            parent
 * @return {Object}
 *
 * @public
 */
helpers.getRelationInstance = function (relationKey, parent) {
  const relation = parent.prototype[relationKey]
  if (typeof (relation) !== 'function') {
    throw new ModelRelationNotFound(`cannot find ${relationKey} as a relation`)
  }
  return relation.apply(parent.prototype)
}

/**
 * passes nested relations for relationInstance
 *
 * @method passNestedRelations
 *
 * @param  {Object}            relationInstance
 * @param  {Array}            nestedRelations
 *
 * @public
 */
helpers.passNestedRelations = function (relationInstance, nestedRelations, relationKey) {
  if (nestedRelations[relationKey]) {
    relationInstance.addWith(nestedRelations[relationKey])
  }
}

/**
 * passed nested scopes to the relation instance
 *
 * @param  {Object}         relationInstance
 * @param  {Object}         nestedScopes
 * @param  {String}         relationKey
 *
 * @public
 */
helpers.passNestedScopes = function (relationInstance, nestedScopes, relationKey) {
  _.each(nestedScopes[relationKey], (scope, name) => {
    relationInstance.addScope(name, scope)
  })
}

/**
 * looks for dynamic scope method on model defination
 *
 * @method getScopeMethod
 *
 * @param  {Object}       target
 * @param  {String}       method
 * @return {Function|Null}
 *
 * @public
 */
helpers.getScopeMethod = function (target, method) {
  const scopedName = util.makeScopeMethodName(method)
  return target[scopedName] || null
}

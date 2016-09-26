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
const cf = require('co-functional')
const CE = require('../../Exceptions')

class EagerLoad {

  constructor () {
    this.instantiate()
  }

  /**
   * instantiate instance by setting defaults for the class
   *
   * @method instantiate
   */
  instantiate () {
    this.withRelations = []
    this.withNestedRelations = {}
    this.relationsScope = {}
    this.nestedRelationsScope = {}
  }

  /**
   * reset the instance back to it's original state
   *
   * @method reset
   */
  reset () {
    this.instantiate()
  }

  /**
   * stores nested relation for a given root relation. Nested scopes are
   * passed to relationInstance on runtime
   *
   * @param  {String}            root
   * @param  {Array}            relation
   *
   * @private
   */
  _pushNestedRelation (root, relation) {
    this.withNestedRelations[root] = this.withNestedRelations[root] || []
    this.withNestedRelations[root].push(_.tail(relation).join('.'))
  }

  /**
   * stores nested scope for a given root relation. Nested scopes are
   * passed to relationInstance on runtime
   *
   * @param  {String}         root
   * @param  {String}         key
   * @param  {Function}       callback
   *
   * @private
   */
  _pushNestedScope (root, key, callback) {
    const nestedScopeKey = _.tail(key).join('.')
    this.nestedRelationsScope[root] = this.nestedRelationsScope[root] || {}
    this.nestedRelationsScope[root][nestedScopeKey] = callback
  }

  /**
   * returns instance of a given relation by calling relation method
   * on parent model.
   *
   * @param  {String}             relationKey
   * @param  {Object}             parent
   * @return {Object}
   *
   * @throws {ModelRelationNotFound} If relationship is not defined on model
   *
   * @private
   */
  _getRelationInstance (relationKey, parent) {
    const relation = parent[relationKey]
    if (typeof (relation) !== 'function') {
      throw CE.ModelRelationException.undefinedRelation(relation, parent.name)
    }
    return relation.apply(parent)
  }

  /**
   * returns relationship instance of a relation when relation is called
   * from a static method instance of model instance.
   *
   * @method _getRelationProtoInstance
   *
   * @param  {String}                  relationKey
   * @param  {Object}                  parent
   * @return {Object}
   *
   * @throws {ModelRelationException:undefinedRelation} If relationship is not defined on model
   *
   * @public
   */
  _getRelationProtoInstance (relationKey, parent) {
    const relation = parent.prototype[relationKey]
    if (typeof (relation) !== 'function') {
      throw CE.ModelRelationException.undefinedRelation(relationKey, parent.name)
    }
    return relation.apply(parent.prototype)
  }

  /**
   * this method will pass all the nested relations for a given
   * relation to the relationInstance.
   *
   * @param  {String}             relation
   * @param  {Object}             relationInstance
   *
   * @private
   */
  _passNestedRelations (relation, relationInstance) {
    if (this.withNestedRelations[relation]) {
      relationInstance.addWith(this.withNestedRelations[relation])
    }
  }

  /**
   * this method will pass any given nested scopes for a given
   * relation to the relationInstance.
   *
   * @param  {String}          relation
   * @param  {Object}          relationInstance
   *
   * @private
   */
  _passNestedScopes (relation, relationInstance) {
    _.each(this.nestedRelationsScope[relation], (scope, name) => {
      relationInstance.addScope(name, scope)
    })
  }

  /**
   * returns values for a join key. These values are used for
   * running a SQL query with whereIn clause.
   *
   * @param  {Object}          mappedKeys
   * @param  {Object}          mappedKeysValues
   * @param  {String}          relation
   * @param  {Object}          relationInstance
   * @param  {Array}          values
   * @return {Array}
   *
   * @private
   */
  _getJoinKeyValues (mappedKeys, mappedKeysValues, fallbackValues, relation, relationInstance, values) {
    if (!mappedKeys[relation]) {
      mappedKeys[relation] = relationInstance.fromKey
      fallbackValues[relation] = relationInstance.eagerLoadFallbackValue
      if (_.isArray(values)) {
        mappedKeysValues[relation] = values.map((value) => value[relationInstance.fromKey])
      } else {
        mappedKeysValues[relation] = values[relationInstance.fromKey]
      }
    }
    return mappedKeysValues[relation]
  }

  /**
   * this method will set an array of relations to be eager
   * loaded.
   *
   * @param  {Array} relations
   *
   * @example
   * eagerLoad.with(['account', 'user.country'])
   *
   * @public
   */
  with (relations) {
    _.each(relations, (relation) => {
      relation = relation.split('.')
      const rootRelation = relation[0]
      this.withRelations.push(rootRelation)
      if (_.size(relation) > 1) {
        this._pushNestedRelation(rootRelation, relation)
      }
    })
  }

  /**
   * appends a new scope to the scopes object. Each relation
   * can only have one runtime scope.
   *
   * @param  {String}    key
   * @param  {Function}  callback
   *
   * @public
   */
  appendScope (key, callback) {
    key = key.split('.')
    const rootScopeName = key[0]
    if (_.size(key) > 1) {
      this._pushNestedScope(rootScopeName, key, callback)
    } else {
      this.relationsScope[rootScopeName] = callback
    }
  }

  /**
   * this method will eagerLoad previously attached relations
   * for a given parent model.
   *
   * @param  {Array} result
   * @param  {Object} parent
   * @return {Object}
   *
   * @public
   */
  load (result, parent, isSingle) {
    const self = this
    const mappedKeys = {}
    const fallbackValues = {}
    const mappedKeysValues = {}

    /**
     * here we parallely execute all eagerly registered
     * relations.
     */
    const response = cf.map(function * (relation) {
      const relationScope = self.relationsScope[relation]
      const relationInstance = isSingle ? self._getRelationInstance(relation, parent) : self._getRelationProtoInstance(relation, parent)
      const values = self._getJoinKeyValues(mappedKeys, mappedKeysValues, fallbackValues, relation, relationInstance, result)

      /**
       * here we pass nested relations and scopes to the relationInstance
       * implemented methods will pass only of nested values exists.
       */
      self._passNestedRelations(relation, relationInstance)
      self._passNestedScopes(relation, relationInstance)

      if (isSingle) {
        return yield relationInstance.eagerLoadSingle(values, relationScope)
      }
      return yield relationInstance.eagerLoad(values, relationScope)
    }, this.withRelations)

    return {values: response, keys: mappedKeys, fallbackValues}
  }

  /**
   * this method will map loaded relations with a given single
   * row.
   *
   * @param  {Object}          eagerLoadResult
   * @param  {Object}          parent
   * @param  {Object}          row
   *
   * @public
   */
  mapRelationsToRow (eagerLoadResult, parent, row) {
    if (_.size(eagerLoadResult)) {
      const keys = eagerLoadResult.keys
      const values = eagerLoadResult.values
      const fallbackValues = eagerLoadResult.fallbackValues
      const relationsArray = Object.keys(keys)

      _.each(values, (value, index) => {
        const relationKey = relationsArray[index]
        const fromKey = keys[relationKey]
        parent.relations[relationKey] = value[row[fromKey]] || fallbackValues[relationKey]
      })
    }
  }
}

module.exports = EagerLoad

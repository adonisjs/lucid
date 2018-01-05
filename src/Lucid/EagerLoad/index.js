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
const RelationsParser = require('../Relations/Parser')

/**
 * This class makes the required queries and returned transformed
 * output of eagerloaded relations.
 *
 * Also multiple relations are resolved parallely
 *
 * @class EagerLoad
 * @constructor
 */
class EagerLoad {
  constructor (relations) {
    this._relations = RelationsParser.parseRelations(relations)
  }

  /**
   * Calls the eagerloading callback on the related instance
   * query only when defined
   *
   * @method _applyRuntimeConstraints
   *
   * @param  {Object}     relationInstance
   * @param  {Function}   callback
   *
   * @return {void}
   *
   * @private
   */
  _applyRuntimeConstraints (relationInstance, callback) {
    if (typeof (callback) === 'function') {
      callback(relationInstance)
    }
  }

  /**
   * Chain the nested relationship by calling `with`
   * on the relationship instance and this goes on
   * recursively.
   *
   * @method _chainNested
   *
   * @param  {Object}     options.relatedQuery
   * @param  {Object}     nested
   *
   * @return {void}
   *
   * @private
   */
  _chainNested ({ relatedQuery }, nested) {
    _.each(nested || {}, (callback, name) => {
      relatedQuery.with(name, callback)
    })
  }

  /**
   * Loads a single relationship of the model. This method
   * will execute parallel queries for multiple relations.
   *
   * The return value is a key/value pair of relations and
   * their resolved values.
   *
   * @method loadForOne
   *
   * @return {Object}
   */
  async loadForOne (modelInstance) {
    const relationsKeys = _.keys(this._relations)

    /**
     * Gets an array of queries to be executed in parallel
     */
    const queries = _.map(this._relations, (attributes, relation) => {
      RelationsParser.validateRelationExistence(modelInstance, relation)
      const relationInstance = RelationsParser.getRelatedInstance(modelInstance, relation)
      this._applyRuntimeConstraints(relationInstance, attributes.callback)
      this._chainNested(relationInstance, attributes.nested)
      return relationInstance.load()
    })

    const relatedModels = await Promise.all(queries)

    /**
     * Since Promise.all returns values in an order, we can map
     * each relation value back to it's key.
     *
     * For example: If we are loading `profiles` and `settings` for a
     * given user, we will get back result back in same order and
     * then we can transform the result and return an object
     * with key/value pairs.
     */
    return _.transform(relationsKeys, (result, key, index) => {
      result[key] = relatedModels[index]
      return result
    }, {})
  }

  /**
   * Load relationships for all the model instances and set
   * relationships on the model instances using @ref('Model.setRelated')
   *
   * @method load
   *
   * @param  {Array} modelInstances
   *
   * @return {void}
   */
  async load (modelInstances) {
    const relationsKeys = _.keys(this._relations)

    /**
     * Since all rows will belongs to the same user, we just need
     * any one instance for reading some properties of the
     * instance.
     */
    const modelInstance = modelInstances[0]

    /**
     * An array of queries to be executed queries parallel
     */
    const queries = _.map(this._relations, (attributes, relation) => {
      RelationsParser.validateRelationExistence(modelInstance, relation)
      const relationInstance = RelationsParser.getRelatedInstance(modelInstance, relation)
      this._applyRuntimeConstraints(relationInstance, attributes.callback)
      this._chainNested(relationInstance, attributes.nested)
      return relationInstance.eagerLoad(modelInstances)
    })

    const relatedModelsGroup = await Promise.all(queries)

    /**
     * Here we have an array of different relations for multiple parent
     * records. What we need is to fetch the parent level record and
     * set relationships for each relation on it. Same is done
     * for all parent records.
     */
    _.each(relationsKeys, (key, index) => {
      const relationGroups = relatedModelsGroup[index]
      /**
       * We should loop over actual data set and not the resolved relations.
       * There are chances when actual relation set will have more rows
       * than relations, in that case we need to set relations to
       * `null` or whatever the default value is.
       */
      _.each(modelInstances, (modelInstance) => {
        /**
         * Find the actual value of the relationship for that model instances
         */
        const value = relationGroups.values.find((group) => {
          return group.identity === modelInstance[relationGroups.key]
        }) || { value: relationGroups.defaultValue }

        /**
         * Setting relationship on the parent model instance
         */
        modelInstance.setRelated(key, value.value)
      })
    })
  }
}

module.exports = EagerLoad

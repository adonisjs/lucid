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
const CE = require('../../Exceptions')

/**
 * This class parses the relationship string to an
 * object.
 *
 * @class RelationParser
 * @static
 */
class RelationParser {
  /**
   * Returns the relationships object
   *
   * @method _normalizeRelations
   *
   * @param {Object|String[]}             relations
   *
   * @return {Object}
   */
  _normalizeRelations (relations) {
    if (!Array.isArray(relations)) {
      return relations
    }

    return _.transform(relations, (result, relation) => {
      return (result[relation] = null)
    }, {})
  }

  /**
   * Parses an object of relationship strings into
   * a new object
   *
   * @method parseRelations
   *
   * @param  {Object|String[]}       relations
   *
   * @return {Object}
   */
  parseRelations (relations) {
    return _.transform(this._normalizeRelations(relations), (result, callback, relation) => {
      const parsedRelation = this.parseRelation(relation, callback)
      const existingRelation = result[parsedRelation.name]

      /**
       * Update existing relation properties when it already
       * exists.
       */
      if (existingRelation) {
        existingRelation.callback = parsedRelation.callback
        _.each(parsedRelation.nested, (v, k) => {
          existingRelation.nested = existingRelation.nested || {}
          existingRelation.nested[k] = v
        })
        return result
      }

      /**
       * Otherwise add new key/value pair to result
       */
      result[parsedRelation.name] = parsedRelation
      return result
    }, {})
  }

  /**
   * Parse a single relationship string
   *
   * @method parseRelation
   *
   * @param  {String}      relation
   * @param  {Function}    callback
   *
   * @return {Object}
   */
  parseRelation (relation, callback = null) {
    let [name, nested] = relation.split(/\.(.+)/)

    /**
     * Setup nested relation when it exists
     */
    nested = nested ? { [nested]: callback } : null
    const map = { nested, name }

    /**
     * The callback belongs to parent relation only
     * when nested relation does not exists.
     */
    map.callback = !nested ? callback : null
    return map
  }

  /**
   * Validates the model instance to make sure the relationship
   * exists.
   *
   * @method validateRelationExistence
   *
   * @param  {Object}                   modelInstance
   * @param  {String}                   relation
   *
   * @return {void}
   */
  validateRelationExistence (modelInstance, relation) {
    if (typeof (modelInstance[relation]) !== 'function') {
      throw CE.RuntimeException.undefinedRelation(relation, modelInstance.constructor.name)
    }
  }

  /**
   * Returns the relationship instance by calling the relationship
   * method on the model instance.
   *
   * @method getRelatedInstance
   *
   * @param  {Object}            modelInstance
   * @param  {String}            relation
   *
   * @return {void}
   */
  getRelatedInstance (modelInstance, relation) {
    return modelInstance[relation]()
  }
}

module.exports = new RelationParser()

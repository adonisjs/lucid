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

class EagerLoad {
  constructor (model, relations) {
    this._model = model
    this._relations = {}
    this._parseRelations(relations)
  }

  /**
   * Parses the eagerloading string passed to `with` or
   * `load`.
   *
   * @method _parseRelations
   *
   * @param  {Object}             relations
   *
   * @return {void}
   */
  _parseRelations (relations) {
    _.each(relations, (callback = null, relation) => {
      let [name, nested] = relation.split(/\.(.+)/)

      /**
       * Setup nested relation when it exists
       */
      nested = nested ? { [nested]: callback } : null
      const map = { nested }

      /**
       * The callback belongs to parent relation only
       * when nested relation does not exists.
       */
      map.callback = !nested ? callback : null

      /**
       * Find if there is already an existing relationship
       * and use that over creating a new one
       */
      const existingRelation = this._relations[name]
      if (existingRelation) {
        existingRelation.callback = map.callback
        _.each(map.nested, (v, k) => {
          existingRelation.nested[k] = v
        })
        return
      }

      /**
       * Otherwise push a new relationship
       */
      this._relations[name] = map
    })
  }

  /**
   * Loads a single relationship of the model. This method
   * will execute parallel queries for multiple relations.
   *
   * The return value is a key/value pair of relations and
   * their resolved values.
   *
   * @method loadOne
   *
   * @return {Object}
   */
  async loadOne () {
    const relationsKeys = _.keys(this._relations)

    const queries = _.map(this._relations, (attributes, relation) => {
      if (typeof (this._model[relation]) !== 'function') {
        throw CE.RuntimeException.undefinedRelation(relation, this._model.constructor.name)
      }

      const relationInstance = this._model[relation]()
      if (typeof (attributes.callback) === 'function') {
        attributes.callback(relationInstance.query)
      }
      return relationInstance.load()
    })

    const results = await Promise.all(queries)
    return _.transform(relationsKeys, (result, key, index) => {
      result[key] = results[index]
      return result
    }, {})
  }
}

module.exports = EagerLoad



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
const helpers = require('../helpers')

class BaseSerializer {

  constructor (queryBuilder, proxyScope) {
    /**
     * this is the reference to the proxied query builder.
     * Something we call "target" inside custom proxy
     * methods. @ref - Lucid/QueryBuilder/index.js
     */
    this.queryBuilder = queryBuilder

    /**
     * required when calling global scoped methods.
     */
    this.proxyScope = proxyScope
  }

  /**
   * decorates the existing query by calling all
   * globalScope methods.
   *
   * @private
   */
  _decorateQuery () {
    const globalScope = this.queryBuilder.HostModel.globalScope
    if (_.size(globalScope)) {
      _.each(globalScope, (scopeMethod) => {
        scopeMethod(this.proxyScope)
      })
    }
  }

  /**
   * executes query chain and eager load previously
   * defined relations using `with` method.
   *
   * @return {Object}
   *
   * @private
   */
  * _executeQueryChain () {
    let eagerlyFetched = []
    this._decorateQuery()
    const values = yield this.queryBuilder.modelQueryBuilder

    /**
     * eagerly fetch all relations which are set for eagerLoad and
     * also the previous query execution returned some results.
     */
    if (_.size(this.queryBuilder.eagerLoad.withRelations) && _.size(values)) {
      eagerlyFetched = yield this.queryBuilder.eagerLoad.load(values, this.queryBuilder.HostModel)
    }
    return {eagerlyFetched, values}
  }

  /**
   * converts the final result set into a custom collection
   *
   * @param  {Array} values      [description]
   * @param  {Array} eagerValues [description]
   * @return {Collection}             [description]
   *
   * @private
   */
  _toCollection (values, eagerValues) {
    /**
     * here we convert an array to a collection, and making sure each
     * item inside an array is an instance of it's parent model.
     */
    return helpers.toCollection(values).transform((result, value, index) => {
      const modelInstance = new this.queryBuilder.HostModel()
      modelInstance.attributes = value
      modelInstance.original = _.clone(modelInstance.attributes)
      this.queryBuilder.eagerLoad.mapRelationsToRow(eagerValues, modelInstance, value)
      result[index] = modelInstance
    })
  }

  /**
   * fetch query results and wrap them inside a custom
   * collection.
   *
   * @return {Collection}
   *
   * @public
   */
  * fetch () {
    const queryResult = yield this._executeQueryChain()
    return this._toCollection(queryResult.values, queryResult.eagerlyFetched)
  }
}

module.exports = BaseSerializer

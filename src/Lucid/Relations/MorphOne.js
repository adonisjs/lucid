'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const MorphOneOrMany = require('./MorphOneOrMany')
const CE = require('../../Exceptions')

class MorphOne extends MorphOneOrMany {
  /**
   * empty placeholder to be used when unable to eagerload
   * relations.
   *
   * @method eagerLoadFallbackValue
   *
   * @return {Null}
   */
  get eagerLoadFallbackValue () {
    return null
  }

  /**
   * returns result of this.first
   *
   * @see this.first()
   * @return {Object}
   *
   * @public
   */
  fetch () {
    return this.first()
  }

  /**
   * morphOne cannot have paginate
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  paginate () {
    throw CE.ModelRelationException.unSupportedMethod('paginate', this.constructor.name)
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key.
   *
   * @param {Array} values
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoad (values, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .whereIn(this.toKey, values)
      .fetch()
    return results.keyBy((item) => {
      return item[this.toKey]
    }).value()
  }

  /**
   * will eager load the relation for multiple values on related
   * model and returns an object with values grouped by foreign
   * key. It is equivalent to eagerLoad but query defination
   * is little different.
   *
   * @param  {Mixed} value
   * @return {Object}
   *
   * @public
   *
   */
  * eagerLoadSingle (value, scopeMethod) {
    if (typeof (scopeMethod) === 'function') {
      scopeMethod(this.relatedQuery)
    }
    const results = yield this.relatedQuery
      .where(this.typeKey, this.typeValue)
      .where(this.toKey, value)
      .first()
    const response = {}
    response[value] = results
    return response
  }

  /**
   * morphOne cannot have createMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * createMany () {
    throw CE.ModelRelationException.unSupportedMethod('createMany', this.constructor.name)
  }

  /**
   * morphOne cannot have saveMany, since it
   * maps one to one relationship
   *
   * @public
   *
   * @throws CE.ModelRelationException
   */
  * saveMany () {
    throw CE.ModelRelationException.unSupportedMethod('saveMany', this.constructor.name)
  }
}

module.exports = MorphOne

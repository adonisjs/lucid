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
const BaseRelation = require('./BaseRelation')

/**
 * The BelongsTo relationship defines a relation between
 * two models
 *
 * @class BelongsTo
 * @constructor
 */
class BelongsTo extends BaseRelation {
  /**
   * Load a single relationship from parent to child
   * model, but only for one row.
   *
   * @method load
   *
   * @param  {String|Number}     value
   *
   * @return {Model}
   */
  load () {
    return this.relatedQuery.where(this.foreignKey, this.$primaryKeyValue).first()
  }

  mapValues (modelInstances) {
    return _.map(modelInstances, (modelInstance) => modelInstance[this.primaryKey])
  }

  group (relatedInstances) {
    const transformedValues = _.transform(relatedInstances, (result, relatedInstance) => {
      const foreignKeyValue = relatedInstance[this.foreignKey]
      const existingRelation = _.find(result, (row) => row.identity === foreignKeyValue)

      /**
       * If there is already an existing instance for same parent
       * record. We should override the value and do WARN the
       * user since hasOne should never have multiple
       * related instance.
       */
      if (existingRelation) {
        existingRelation.value = relatedInstance
        return result
      }

      result.push({
        identity: foreignKeyValue,
        value: relatedInstance
      })
      return result
    }, [])

    return { key: this.primaryKey, values: transformedValues, defaultValue: null }
  }

  fetch () {
    return this.first()
  }

  /**
   * Returns the related where query
   *
   * @method relatedWhere
   *
   * @param  {Boolean}     count
   *
   * @return {Object}
   */
  relatedWhere (count) {
    this.relatedQuery.whereRaw(`${this.$primaryTable}.${this.primaryKey} = ${this.$foriegnTable}.${this.foreignKey}`)
    if (count) {
      this.relatedQuery.count('*')
    }
    return this.relatedQuery.query
  }
}

module.exports = BelongsTo

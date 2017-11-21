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

/**
 * The vanilla serailizer is the bare bones serializer
 * shipped with Lucid and is set as the default
 * serializer.
 *
 * @class VanillaSerializer
 * @constructor
 */
class VanillaSerializer {
  constructor (rows, pages = null, isOne = false) {
    /**
     * The serializer rows. All rows should be instance
     * of Lucid model
     *
     * @attribute rows
     *
     * @type {Array}
     */
    this.rows = rows

    /**
     * The pagination meta data
     *
     * @attribute pages
     *
     * @type {Object}
     */
    this.pages = pages

    /**
     * A boolean indicating whether return output of
     * toJSON should be an array of an object.
     *
     * @attribute isOne
     *
     * @type {Boolean}
     */
    this.isOne = isOne
  }

  /**
   * Attaches the eagerloaded relationship to the return
   * payload.
   *
   * @method _attachRelations
   *
   * @param  {Model}         modelInstance
   * @param  {Object}         output
   *
   * @return {void}
   *
   * @private
   */
  _attachRelations (modelInstance, output) {
    _.each(modelInstance.$relations, (values, relation) => {
      output[relation] = values && typeof (values.toJSON) === 'function' ? values.toJSON() : values
    })
  }

  /**
   * Attaches sideloaded data to the `__meta__` key on the
   * output object
   *
   * @method _attachMeta
   *
   * @param  {Model}    modelInstance
   * @param  {Object}    output
   *
   * @return {void}
   *
   * @private
   */
  _attachMeta (modelInstance, output) {
    if (_.size(modelInstance.$sideLoaded)) {
      output.__meta__ = _.clone(modelInstance.$sideLoaded)
    }
  }

  /**
   * Returns the json object for a given model instance
   *
   * @method _getRowJSON
   *
   * @param  {Model}    modelInstance
   *
   * @return {Object}
   *
   * @private
   */
  _getRowJSON (modelInstance) {
    const json = modelInstance.toObject()
    this._attachRelations(modelInstance, json)
    this._attachMeta(modelInstance, json)
    return json
  }

  /**
   * Add row to the list of rows. Make sure the row
   * is an instance of the same model as the other
   * model instances.
   *
   * @method addRow
   *
   * @param  {Model} row
   */
  addRow (row) {
    this.rows.push(row)
  }

  /**
   * Get first model instance
   *
   * @method first
   *
   * @return {Model}
   */
  first () {
    return _.first(this.rows)
  }

  /**
   * Returns the row for the given index
   *
   * @method nth
   *
   * @param  {Number} index
   *
   * @return {Model|Null}
   */
  nth (index) {
    return _.nth(this.rows, index) || null
  }

  /**
   * Get last model instance
   *
   * @method last
   *
   * @return {Model}
   */
  last () {
    return _.last(this.rows)
  }

  /**
   * Returns the size of rows
   *
   * @method size
   *
   * @return {Number}
   */
  size () {
    return this.isOne ? 1 : this.rows.length
  }

  /**
   * Convert all rows/model instances to their JSON
   * representation
   *
   * @method toJSON
   *
   * @return {Array|Object}
   */
  toJSON () {
    if (this.isOne) {
      return this._getRowJSON(this.rows)
    }

    const data = this.rows.map(this._getRowJSON.bind(this))
    if (this.pages) {
      return _.merge({}, this.pages, { data })
    }
    return data
  }
}

module.exports = VanillaSerializer

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
const moment = require('moment')
const Hooks = require('../Hooks')
const GlobalScopes = require('../GlobalScope')
const VanillaSerializer = require('../Serializers/Vanilla')
const { ioc } = require('../../../lib/iocResolver')
const DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/**
 * The base model to share attributes with Lucid
 * model and the Pivot model.
 *
 * @class BaseModel
 * @constructor
 */
class BaseModel {
  constructor () {
    this._instantiate()
    return new Proxy(this, require('./proxyHandler'))
  }

  /**
   * The attributes to be considered as dates. By default
   * @ref('Model.createdAtColumn') and @ref('Model.updatedAtColumn')
   * are considered as dates.
   *
   * @attribute dates
   *
   * @return {Array}
   *
   * @static
   */
  static get dates () {
    const dates = []
    if (this.createdAtColumn) { dates.push(this.createdAtColumn) }
    if (this.updatedAtColumn) { dates.push(this.updatedAtColumn) }
    return dates
  }

  /**
   * The attribute name for created at timestamp.
   *
   * @attribute createdAtColumn
   *
   * @return {String}
   *
   * @static
   */
  static get createdAtColumn () {
    return 'created_at'
  }

  /**
   * The attribute name for updated at timestamp.
   *
   * @attribute updatedAtColumn
   *
   * @return {String}
   *
   * @static
   */
  static get updatedAtColumn () {
    return 'updated_at'
  }

  /**
   * The serializer to be used for serializing
   * data. The return value must always be a
   * ES6 class.
   *
   * By default Lucid uses @ref('VanillaSerializer')
   *
   * @attribute Serializer
   *
   * @return {Class}
   */
  static get Serializer () {
    return VanillaSerializer
  }

  /**
   * The database connection to be used for
   * the model. Returning blank string will
   * use the `default` connection.
   *
   * @attribute connection
   *
   * @return {String}
   *
   * @static
   */
  static get connection () {
    return ''
  }

  /**
   * This method is executed for all the date fields
   * with the field name and the value. The return
   * value gets saved to the database.
   *
   * Also if you have defined a setter for a date field
   * this method will not be executed for that field.
   *
   * @method formatDates
   *
   * @param  {String}    key
   * @param  {String|Date}    value
   *
   * @return {String}
   */
  static formatDates (key, value) {
    return moment(value).format(DATE_FORMAT)
  }

  /**
   * Resolves the serializer for the current model.
   *
   * If serializer is a string, then it is resolved using
   * the Ioc container, otherwise it is assumed that
   * a `class` is returned.
   *
   * @method resolveSerializer
   *
   * @returns {Class}
   */
  static resolveSerializer () {
    return typeof (this.Serializer) === 'string' ? ioc.use(this.Serializer) : this.Serializer
  }

  /**
   * This method is executed when toJSON is called on a
   * model or collection of models. The value received
   * will always be an instance of momentjs and return
   * value is used.
   *
   * NOTE: This method will not be executed when you define
   * a getter for a given field.
   *
   * @method castDates
   *
   * @param  {String}  key
   * @param  {Moment}  value
   *
   * @return {String}
   *
   * @static
   */
  static castDates (key, value) {
    return value.format(DATE_FORMAT)
  }

  /**
   * Method to be called only once to boot
   * the model.
   *
   * NOTE: This is called automatically by the IoC
   * container hooks when you make use of `use()`
   * method.
   *
   * @method boot
   *
   * @return {void}
   *
   * @static
   */
  static boot () {
    this.hydrate()
    _.each(this.traits, (trait) => this.addTrait(trait))
  }

  /**
   * Hydrates model static properties by re-setting
   * them to their original value.
   *
   * @method hydrate
   *
   * @return {void}
   *
   * @static
   */
  static hydrate () {
    /**
     * Model hooks for different lifecycle
     * events
     *
     * @type {Object}
     */
    this.$hooks = {
      before: new Hooks(),
      after: new Hooks()
    }

    /**
     * List of global query listeners for the model.
     *
     * @type {Array}
     */
    this.$queryListeners = []

    /**
     * List of global query scopes. Chained before executing
     * query builder queries.
     */
    this.$globalScopes = new GlobalScopes()

    /**
     * We use the default query builder class to run queries, but as soon
     * as someone wants to add methods to the query builder via traits,
     * we need an isolated copy of query builder class just for that
     * model, so that the methods added via traits are not impacting
     * other models.
     */
    this.QueryBuilder = null
  }

  /**
   * Tells whether model instance is new or
   * persisted to database.
   *
   * @attribute isNew
   *
   * @return {Boolean}
   */
  get isNew () {
    return !this.$persisted
  }

  /**
   * Returns a boolean indicating whether model
   * has been deleted or not
   *
   * @method isDeleted
   *
   * @return {Boolean}
   */
  get isDeleted () {
    return this.$frozen
  }

  /**
   * Instantiate the model by defining constructor properties
   * and also setting `__setters__` to tell the proxy that
   * these values should be set directly on the constructor
   * and not on the `attributes` object.
   *
   * @method instantiate
   *
   * @return {void}
   *
   * @private
   */
  _instantiate () {
    this.__setters__ = [
      '$attributes',
      '$persisted',
      'primaryKeyValue',
      '$originalAttributes',
      '$relations',
      '$sideLoaded',
      '$parent',
      '$frozen',
      '$visible',
      '$hidden'
    ]

    this.$attributes = {}
    this.$persisted = false
    this.$originalAttributes = {}
    this.$relations = {}
    this.$sideLoaded = {}
    this.$parent = null
    this.$frozen = false
    this.$visible = this.constructor.visible
    this.$hidden = this.constructor.hidden
  }

  /**
   * Set attributes on model instance in bulk.
   *
   * NOTE: Calling this method will remove the existing attributes.
   *
   * @method fill
   *
   * @param  {Object} attributes
   *
   * @return {void}
   */
  fill (attributes) {
    this.$attributes = {}
    this.merge(attributes)
  }

  /**
   * Merge attributes into on a model instance without
   * overriding existing attributes and their values
   *
   * @method fill
   *
   * @param  {Object} attributes
   *
   * @return {void}
   */
  merge (attributes) {
    _.each(attributes, (value, key) => this.set(key, value))
  }

  /**
   * Freezes the model instance for modifications
   *
   * @method freeze
   *
   * @return {void}
   */
  freeze () {
    this.$frozen = true
  }

  /**
   * Unfreezes the model allowing further modifications
   *
   * @method unfreeze
   *
   * @return {void}
   */
  unfreeze () {
    this.$frozen = false
  }

  /**
   * Converts model instance toJSON using the serailizer
   * toJSON method
   *
   * @method toJSON
   *
   * @return {Object}
   */
  toJSON () {
    const Serializer = this.constructor.resolveSerializer()
    return new Serializer(this, null, true).toJSON()
  }
}

module.exports = BaseModel

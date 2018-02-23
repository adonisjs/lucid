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
const chancejs = require('./chance')
const { ioc } = require('../../lib/iocResolver')

/**
 * Model factory to seed database using Lucid
 * models
 *
 * @class DatabaseFactory
 * @constructor
 */
class DatabaseFactory {
  constructor (tableName, dataCallback) {
    this.tableName = tableName
    this.dataCallback = dataCallback
    this._returningColumn = null
    this._connection = null
  }

  /**
   * Returns the query builder instance for
   * a given connection
   *
   * @method _getQueryBuilder
   *
   * @return {Object}
   *
   * @private
   */
  _getQueryBuilder () {
    return this._connection
      ? ioc.use('Adonis/Src/Database').connection(this._connection)
      : ioc.use('Adonis/Src/Database')
  }

  /**
   * Make a single instance of blueprint for a given
   * index. This method will evaluate the functions
   * in the return payload from blueprint.
   *
   * @method _makeOne
   * @async
   *
   * @param  {Number} index
   * @param  {Object} data
   *
   * @return {Object}
   *
   * @private
   */
  async _makeOne (index, data) {
    const hash = await this.dataCallback(chancejs, index, data)
    const keys = _.keys(hash)

    /**
     * Evaluate all values
     */
    const values = await Promise.all(_.map(_.values(hash), (val) => {
      return typeof (val) === 'function' ? Promise.resolve(val()) : val
    }))

    /**
     * Pair them back in same order
     */
    return _.transform(keys, (result, key, index) => {
      result[key] = values[index]
      return result
    }, {})
  }

  /**
   * Set table to used for the database
   * operations
   *
   * @method table
   *
   * @param  {String} tableName
   *
   * @chainable
   */
  table (tableName) {
    this.tableName = tableName
    return this
  }

  /**
   * Specify the returning column from the insert
   * query
   *
   * @method returning
   *
   * @param  {String}  column
   *
   * @chainable
   */
  returning (column) {
    this._returningColumn = column
    return this
  }

  /**
   * Specify the connection to be used on
   * the query builder
   *
   * @method connection
   *
   * @param  {String}   connection
   *
   * @chainable
   */
  connection (connection) {
    this._connection = connection
    return this
  }

  /**
   * Make a single model instance with attributes
   * from blueprint fake values
   *
   * @method make
   * @async
   *
   * @param  {Object} data
   * @param  {Number} [index = 0]
   *
   * @return {Object}
   */
  async make (data = {}, index = 0) {
    return this._makeOne(index, data)
  }

  /**
   * Make x number of model instances with
   * fake data
   *
   * @method makeMany
   * @async
   *
   * @param  {Number} instances
   * @param  {Object} [data = {}]
   *
   * @return {Array}
   */
  async makeMany (instances, data = {}) {
    return Promise.all(_.map(_.range(instances), (index) => this.make(data, index)))
  }

  /**
   * Create model instance and persist to database
   * and then return it back
   *
   * @method create
   * @async
   *
   * @param  {Object} data
   *
   * @return {Object}
   */
  async create (data = {}, index = 0) {
    const attributes = await this.make(data, index)
    const query = this._getQueryBuilder().table(this.tableName)

    if (this._returningColumn) {
      query.returning(this._returningColumn)
    }

    return query.insert(attributes)
  }

  /**
   * Persist multiple model instances to database and get
   * them back as an array
   *
   * @method createMany
   * @async
   *
   * @param  {Number}   numberOfRows
   * @param  {Object}   [data = {}]
   *
   * @return {Array}
   */
  async createMany (numberOfRows, data = {}) {
    return Promise.all(_.map(_.range(numberOfRows), (index) => this.create(data, index)))
  }

  /**
   * Truncate the database table
   *
   * @method reset
   * @async
   *
   * @return {Number}
   */
  async reset () {
    return this._getQueryBuilder().table(this.tableName).truncate()
  }
}

module.exports = DatabaseFactory

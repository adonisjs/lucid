'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = require('./proxyHandler')
require('harmony-reflect')

class Schema {
  constructor () {
    this.actions = []
    return new Proxy(this, proxyHandler)
  }

  /**
   * connection to be used while creating schema
   *
   * @return {String}
   *
   * @public
   */
  static get connection () {
    return 'default'
  }
}

module.exports = Schema

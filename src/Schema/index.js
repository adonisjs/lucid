'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxy = require('./proxy')
require('harmony-reflect')

class Schema {
  constructor () {
    this.store = {}
    return new Proxy(this, proxy)
  }

  static get connection () {
    return 'default'
  }
}

module.exports = Schema

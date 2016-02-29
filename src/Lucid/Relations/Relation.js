'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('harmony-reflect')
const proxyHandler = require('./proxyHandler')

class Relation {
  constructor () {
    return new Proxy(this, proxyHandler)
  }
}

module.exports = Relation

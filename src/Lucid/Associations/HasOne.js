'use strict'

/**
 * adonis-framework
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const handler = {
  get: function (target, name) {
    return target.associativeModel[name]
  },

  set: function (target, name, value) {
  }
}

class HasOne {

  constructor (associativeModel, targetModel, primaryKey, foriegnKey) {
    this.associativeModel = associativeModel
    this.targetModel = targetModel
    this.primaryKey = primaryKey
    this.foriegnKey = foriegnKey
    return new Proxy(this, handler)
  }

}

module.exports = HasOne

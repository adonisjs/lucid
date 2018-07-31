'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Chance = require('chance')
const _ = require('lodash')

class Chancejs extends Chance {
  constructor (seed = null) {
    seed ? super(seed) : super()

    /**
     * Adding custom mixins
     */
    this.mixin({
      username: function (length) {
        length = length || 5
        return this.word({length})
      },

      password: function (length) {
        length = length || 20
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        return _.map(_.range(length), () => {
          return charset.charAt(Math.floor(Math.random() * charset.length))
        }).join('')
      }
    })
  }
}

module.exports = Chancejs

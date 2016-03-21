'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const Relation = require('./Relation')

class BelongsToManyThrough extends Relation {

  constructor (parent, related, through, primaryKey, foriegnKey, throughForiegnKey) {
    super(parent, related)
    this.fromKey = primaryKey
    this.toKey = foriegnKey
    this.viaKey = throughForiegnKey
  }

}

module.exports = BelongsToManyThrough

'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

module.exports = {
  HasOne: require('./HasOne'),
  HasMany: require('./HasMany'),
  BelongsTo: require('./BelongsTo'),
  BelongsToMany: require('./BelongsToMany'),
  HasManyThrough: require('./HasManyThrough')
}

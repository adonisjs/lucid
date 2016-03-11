'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const cf = require('co-functional')
const Ioc = require('adonis-fold').Ioc
const Seeder = exports = module.exports = {}

/**
 * executes given seeds in a sequence by calling
 * run method on them.
 *
 * @method exec
 *
 * @param  {Array} seeds
 *
 * @public
 */
Seeder.exec = function (seeds) {
  return cf.forEach(function * (Seed) {
    const seedInstance = typeof (Seed) === 'string' ? Ioc.make(Seed) : new Seed()
    yield seedInstance.run()
  }, seeds)
}

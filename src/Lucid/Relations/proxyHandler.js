'use strict'

/**
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = exports = module.exports = {}

proxyHandler.get = function (target, name) {
  if (target[name]) {
    return target[name]
  }
  return target.relatedQuery[name]
}

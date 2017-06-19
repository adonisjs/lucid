'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const proxyHandler = exports = module.exports = {}
proxyHandler.set = function (target, name, value) {
  if (target.__setters__.indexOf(name) > -1) {
    return target[name] = value
  }
  return target.set(name, value)
}

proxyHandler.get = function (target, name) {
  if (typeof (target[name]) !== 'undefined') {
    return target[name]
  }
  return target.$attributes[name]
}

'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/**
 * Custom resolver for @adonisjs/fold. Since Lucid can be
 * used standalone, this class removes direct dependency
 * with IoC container, but requires a small polyfill
 * over IoC container methods.
 *
 * @class IocResolver
 * @constructor
 */
class IocResolver {
  constructor () {
    this._fold = null
  }

  /**
   * Set custom fold instance
   *
   * @method setFold
   *
   * @param  {String} fold
   *
   * @return {void}
   */
  setFold (fold) {
    this._fold = fold
  }

  /**
   * Returns fold resolver instance
   *
   * @attribute resolver
   *
   * @return {Object}
   */
  get resolver () {
    return this._fold.resolver
  }

  /**
   * Returns fold ioc container instance
   *
   * @attribute ioc
   *
   * @return {Object}
   */
  get ioc () {
    return this._fold.ioc
  }
}

module.exports = new IocResolver()

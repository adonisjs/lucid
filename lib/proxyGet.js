/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

module.exports = function proxyGet (proxyOn, bindFn = false, customCallback = null) {
  return function (target, name) {
    if (typeof (name) === 'symbol' || name === 'inspect') {
      return target[name]
    }

    /**
     * If value exists on the target object, return it
     */
    if (typeof (target[name]) !== 'undefined') {
      return target[name]
    }

    /**
     * If there is a custom callback to resolve values, call
     * the callback and return the value if it's not
     * undefined
     */
    if (typeof (customCallback) === 'function') {
      const result = customCallback.bind(this)(target, name)
      if (typeof (result) !== 'undefined') {
        return result
      }
    }

    /**
     * Get access to source by looking up value on target. Also if
     * value is a function, the fn is executed and return value
     * is used as source.
     */
    const source = typeof (target[proxyOn]) === 'function' ? target[proxyOn]() : target[proxyOn]

    if (typeof (source[name]) === 'function') {
      /**
       * If bindFn is set to true, we disconnect the
       * proxy trap and instead return the instance
       * of source[name]
       */
      if (bindFn) {
        return source[name].bind(source)
      }

      /**
       * Otherwise wrap it inside a closure and return the value.
       * The reason we need to wrap it, so that the `proxyOn`
       * method should have correct reference to `this`.
       */
      return function (...args) {
        source[name](...args)
        return this
      }
    }

    /**
     * Finally fallback to `proxyOn` and return the value of property
     * and if value does not exists, `undefined` is returned
     */
    return source[name]
  }
}

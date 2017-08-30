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
 * Hooks into suite lifcycle and run database
 * queries inside transactions
 *
 * @method exports
 *
 * @param  {Object} suite
 *
 * @return {void}
 */
module.exports = function (suite) {
  suite.beforeEach(async () => {
    await use('Database').beginGlobalTransaction()
  })

  suite.afterEach(() => {
    use('Database').rollbackGlobalTransaction()
  })
}

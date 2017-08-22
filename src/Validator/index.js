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
 * This class exposes the validator rules
 * related to database
 */
class ValidatorRules {
  constructor (Database) {
    this.Database = Database
  }

  /**
   * Verify whether a field inside the database is unique
   * or not.
   *
   * @method unique
   *
   * @param  {Object} data
   * @param  {String} field
   * @param  {String} message
   * @param  {Array} args
   * @param  {Function} get
   *
   * @return {Promise}
   *
   * @example
   * ```js
   * email: 'unique:users' // define table
   * email: 'unique:users,user_email' // define table + field
   * email: 'unique:users,user_email,id:1' // where id !== 1
   *
   * // Via new rule method
   * email: [rule('unique', ['users', 'user_email', 'id', 1])]
   * ```
   */
  unique (data, field, message, args, get) {
    return new Promise((resolve, reject) => {
      const value = get(data, field)

      /**
       * if value is not defined, then skip the validation
       * since required rule should be added for required
       * fields
       */
      if (!value) {
        return resolve('validation skipped')
      }

      /**
       * Extracting values of the args array
       */
      const [ table, fieldName, ignoreKey, ignoreValue ] = args

      /**
       * Base query to select where key=value
       */
      const query = this.Database.table(table).where(fieldName || field, value)

      /**
       * If a ignore key and value is defined, then add a whereNot clause
       */
      if (ignoreKey && ignoreValue) {
        query.whereNot(ignoreKey, ignoreValue)
      }

      query
        .then((rows) => {
          /**
           * Unique validation fails when a row has been found
           */
          if (rows && rows.length) {
            return reject(message)
          }
          resolve('validation passed')
        })
        .catch(reject)
    })
  }
}

module.exports = ValidatorRules

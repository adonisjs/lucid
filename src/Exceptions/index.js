'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const NE = require('node-exceptions')

class RuntimeException extends NE.RuntimeException {
  /**
   * This exception is raised when user is trying to use an
   * undefined database connection
   *
   * @method missingDatabaseConnection
   *
   * @param  {String}                  name
   *
   * @return {Object}
   */
  static missingDatabaseConnection (name) {
    return new this(`Missing database connection {${name}}. Make sure you define it inside config/database.js file`, 500, 'E_MISSING_DB_CONNECTION')
  }

  /**
   * This exception is raised when user is trying to query
   * relationships from an unsaved model instance
   *
   * @method unSavedModel
   *
   * @param  {String}     name
   *
   * @return {Object}
   */
  static unSavedModel (name) {
    return new this(`Cannot process relation, since ${name} model is not persisted to database or relational value is undefined`, 500, 'E_UNSAVED_MODEL_INSTANCE')
  }

  static undefinedRelation (relation, name) {
    return new this(`${relation} is not defined on ${name} model`, 500, 'E_INVALID_MODEL_RELATION')
  }

  static cannotNestRelation (relation, parent, method) {
    const message = `${method} does not allowed nested relations. Instead use .with('${parent}', (builder) => builder.${method}('${relation}'))`
    return new this(message, 500, 'E_CANNOT_NEST_RELATION')
  }
}

class InvalidArgumentException extends NE.InvalidArgumentException {
  static missingParameter (message) {
    return new this(message, 500, 'E_MISSING_PARAMETER')
  }

  static invalidParamter (message) {
    return new this(message, 500, 'E_INVALID_PARAMETER')
  }
}

module.exports = { RuntimeException, InvalidArgumentException }

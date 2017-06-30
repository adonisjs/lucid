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

  /**
   * This exception is raised when an undefined relation is
   * fetched or referenced within the code
   *
   * @method undefinedRelation
   *
   * @param  {String}          relation
   * @param  {String}          name
   *
   * @return {Object}
   */
  static undefinedRelation (relation, name) {
    return new this(`${relation} is not defined on ${name} model`, 500, 'E_INVALID_MODEL_RELATION')
  }

  /**
   * This exception is raised when nested relationships are not
   * supported. `withCount` method is an example of same
   *
   * @method cannotNestRelation
   *
   * @param  {String}           relation
   * @param  {String}           parent
   * @param  {String}           method
   *
   * @return {Object}
   */
  static cannotNestRelation (relation, parent, method) {
    const message = `${method} does not allowed nested relations. Instead use .with('${parent}', (builder) => builder.${method}('${relation}'))`
    return new this(message, 500, 'E_CANNOT_NEST_RELATION')
  }

  /**
   * This exception is raised when you are trying to eagerload
   * relationship for multiple times
   *
   * @method overRidingRelation
   *
   * @param  {String}           relation
   *
   * @return {Object}
   */
  static overRidingRelation (relation) {
    return new this(`Trying to eagerload ${relation} relationship twice`, 500, 'E_CANNOT_OVERRIDE_RELATION')
  }
}

class InvalidArgumentException extends NE.InvalidArgumentException {
  /**
   * This exception is raised when a parameter is missing
   *
   * @method missingParameter
   *
   * @param  {String}         message
   *
   * @return {Object}
   */
  static missingParameter (message) {
    return new this(message, 500, 'E_MISSING_PARAMETER')
  }

  /**
   * This exception is raised when a parameter is invalid
   *
   * @method invalidParamter
   *
   * @param  {String}        message
   *
   * @return {Object}
   */
  static invalidParamter (message) {
    return new this(message, 500, 'E_INVALID_PARAMETER')
  }
}

class ModelException extends NE.LogicalException {
  static deletedInstance (name) {
    return new this(`Cannot edit deleted model instance for ${name} model`, 500, 'E_DELETED_MODEL')
  }
}

class ModelNotFoundException extends NE.LogicalException {
  static raise (name) {
    return new this(`Cannot find database row for ${name} model`, 404, 'E_MISSING_DATABASE_ROW')
  }
}

class ModelRelationException extends NE.LogicalException {
  static unSupportedMethod (method, relation) {
    return new this(`${method} is not supported by ${relation} relation`, 500, 'E_INVALID_RELATION_METHOD')
  }
}

module.exports = {
  RuntimeException,
  InvalidArgumentException,
  ModelException,
  ModelNotFoundException,
  ModelRelationException
}

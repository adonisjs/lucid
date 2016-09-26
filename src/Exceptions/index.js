'use strict'

/**
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
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when a model factory is not defined
   * for a given model, but attempting to access it.
   *
   * @param  {String} model
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static modelFactoryNotFound (model, code) {
    return new this(`Cannot find model factory for ${model}`, code || this.defaultErrorCode, 'E_MISSING_MODEL_FACTORY')
  }

  /**
   * this exception is raised when a dataabse factory is not defined
   * for a given key/table name, but attempting to access it.
   *
   * @param  {String} key
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static databaseFactoryNotFound (key, code) {
    return new this(`Cannot find database factory for ${key}`, code || this.defaultErrorCode, 'E_MISSING_DATABASE_FACTORY')
  }

  /**
   * this exception is raised when migrations are
   * locked and the end-user is still trying to
   * execute migrations.
   *
   * @method migrationsAreLocked
   *
   * @param  {String}            lockTable
   * @param {Number}             [code=500]
   *
   * @return {Object}
   */
  static migrationsAreLocked (lockTable, code) {
    return new this(
      `Migrations are currently locked. Make sure to run single migration process at a given time or delete ${lockTable} table from database`,
      code || this.defaultErrorCode,
      'E_LOCK_ON_MIGRATIONS'
      )
  }

}

class InvalidArgumentException extends NE.InvalidArgumentException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when a method parameter is
   * missing but expected to exist.
   *
   * @param  {String} message
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static missingParameter (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_MISSING_PARAMETER')
  }

  /**
   * this exception is raised when a method parameter value
   * is invalid.
   *
   * @param  {String} message
   * @param  {Number} [code=500]
   *
   * @return {Object}
  */
  static invalidParameter (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_INVALID_PARAMETER')
  }

  /**
   * this exception is raised when a configuration for a given
   * key is missing inside the config store.
   *
   * @param  {String} message
   * @param  {Number} [code=500]
   *
   * @return {Object}
  */
  static missingConfig (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_MISSING_CONFIG')
  }

  /**
   * this exception is raised when a model is instantiated by
   * passing an array of values.
   *
   * @method bulkInstantiate
   *
   * @param  {String}        model
   * @param  {Number}        [code=500]
   *
   * @return {Object}
   */
  static bulkInstantiate (model, code) {
    return this.invalidParameter(`Cannot instantiate ${model} model with multiple rows, using createMany instead`, code)
  }

  /**
   * this exception is raised when trait does not
   * have register method.
   *
   * @method invalidTrait
   *
   * @param  {Number}     [code=500]
   *
   * @return {Object}
   */
  static invalidTrait (code) {
    return new this('Make sure you have defined register method on model', code || this.defaultErrorCode, 'E_INVALID_MODEL_TRAIT')
  }

}

class ModelNotFoundException extends NE.LogicalException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exceptions is raised when unable to find results
   * through a given database query. Generally the
   * exception is throw my OrFail methods.
   *
   * @method raise
   *
   * @param  {String} message
   * @param  {Number} [code=500]
   *
   * @return {Object}
   */
  static raise (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_MISSING_DATABASE_ROW')
  }

}

class ModelException extends NE.LogicalException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when the model state is
   * invalid to make certain actions.
   *
   * @method invalidState
   *
   * @param  {String}     message
   * @param  {Number}     [code=500]
   *
   * @return {Object}
   */
  static invalidState (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_INVALID_MODEL_STATE')
  }

  /**
   * this exception is raised when trying to restore a model
   * when soft deletes are disabled.
   *
   * @method cannotRestore
   *
   * @param  {String}      model
   * @param  {Number}      [code=500]
   *
   * @return {Object}
   */
  static cannotRestore (model, code) {
    return this.invalidState(`Cannot restore ${model} model since soft deletes are not enabled`, code)
  }

}

class ModelRelationException extends NE.LogicalException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when an action is performed
   * on a related model, whereas the target model
   * instance is unsaved
   *
   * @method unSavedTarget
   *
   * @param  {String}      action
   * @param  {String}      target
   * @param  {String}      related
   * @param  {Number}      [code=500]
   *
   * @return {Object}
   */
  static unSavedTarget (action, target, related, code) {
    return new this(
      `Cannot perform ${action} on ${related} model since ${target} instance is unsaved`,
      code || this.defaultErrorCode,
      'E_UNSAVED_MODEL_INSTANCE'
    )
  }

  /**
   * this exception is raised when an invalid model instance is
   * passed to a relationship method. For example- A post
   * model instance has been passed when trying to save
   * user profile.
   *
   * @method relationMisMatch
   *
   * @param  {String}         message
   * @param  {String}         code
   *
   * @return {Object}
   */
  static relationMisMatch (message, code) {
    return new this(message, code || this.defaultErrorCode, 'E_INVALID_RELATION_INSTANCE')
  }

  /**
   * this exception is raised when a non-existing method is called
   * of a relationship. For ex- paginate is not supported by
   * HasOne relationship
   *
   * @method unSupportedMethod
   *
   * @param  {String}          method
   * @param  {String}          relation
   * @param  {Number}          [code=500]
   *
   * @return {Object}
   */
  static unSupportedMethod (method, relation, code) {
    return new this(`${method} is not supported by ${relation} relationship`, code || this.defaultErrorCode, 'E_INVALID_RELATION_METHOD')
  }

  /**
   * this exceptions is raised when database relation
   * is not defined on a model
   *
   * @method undefinedRelation
   *
   * @param  {String}          relation
   * @param  {String}          model
   * @param  {Number}          [code=500]
   *
   * @return {Object}
   */
  static undefinedRelation (relation, model, code) {
    return new this(`${relation} is not defined on ${model} model as a relationship`, code || this.defaultErrorCode, 'E_MISSING_DATABASE_RELATION')
  }

}

class DomainException extends NE.DomainException {

  /**
   * default error code to be used for raising
   * exceptions
   *
   * @return {Number}
   */
  static get defaultErrorCode () {
    return 500
  }

  /**
   * this exception is raised when the schema file is
   * exporting a valid Es2015 class.
   *
   * @method invalidSchemaFile
   *
   * @param  {String}          filePath
   * @param  {Number}          [code=500]
   *
   * @return {Object}
   */
  static invalidSchemaFile (filePath, code) {
    return new this(`Make sure you are exporting a class from ${filePath}`, code || this.defaultErrorCode, 'E_INVALID_SCHEMA_FILE')
  }

  /**
   * this exception is raised when the environment
   * is not safe to perform certain actions.
   *
   * @method unsafeEnv
   *
   * @param  {String}  message
   * @param  {Number}  [code=500]
   *
   * @return {Object}
   */
  static unsafeEnv (message, code) {
    return new this(message, code, 'E_UNSAFE_ENVIRONMENT')
  }

}

module.exports = {
  InvalidArgumentException,
  RuntimeException,
  ModelNotFoundException,
  ModelException,
  ModelRelationException,
  DomainException
}

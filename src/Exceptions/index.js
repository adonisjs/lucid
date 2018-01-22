'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const GE = require('@adonisjs/generic-exceptions')

/**
 * Class to throw runtime exceptions
 *
 * @class RuntimeException
 * @constructor
 */
class RuntimeException extends GE.RuntimeException {
  static get repo () {
    return 'adonisjs/errors'
  }

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
    return new this(`Missing database connection {${name}}. Make sure you define it inside config/database.js file`, 500, 'E_MISSING_DB_CONNECTION', this.repo)
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
    return new this(`Cannot process relation, since ${name} model is not persisted to database or relational value is undefined`, 500, 'E_UNSAVED_MODEL_INSTANCE', this.repo)
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
    return new this(`${relation} is not defined on ${name} model`, 500, 'E_INVALID_MODEL_RELATION', this.repo)
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
    return new this(message, 500, 'E_CANNOT_NEST_RELATION', this.repo)
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
    return new this(`Trying to eagerload ${relation} relationship twice`, 500, 'E_CANNOT_OVERRIDE_RELATION', this.repo)
  }

  /**
   * This exception is raised when migrations are locked but
   * still someone is trying to migrate the database.
   *
   * @method migrationsAreLocked
   *
   * @param  {String}            lockTable
   *
   * @return {Object}
   */
  static migrationsAreLocked (lockTable) {
    return new this(`Migrations are locked. Make sure you are not multiple migration scripts or delete \`${lockTable}\` table manually`)
  }
}

/**
 * Class to lucid model related exceptions
 *
 * @class ModelException
 * @constructor
 */
class ModelException extends GE.LogicalException {
  static get repo () {
    return 'adonisjs/errors'
  }

  static deletedInstance (name) {
    return new this(`Cannot edit deleted model instance for ${name} model`, 500, 'E_DELETED_MODEL', this.repo)
  }
}

/**
 * Exception thrown when a row is not found using
 * findOrFail style methods.
 *
 * @class ModelNotFoundException
 * @constructor
 */
class ModelNotFoundException extends GE.LogicalException {
  static get repo () {
    return 'adonisjs/errors'
  }

  static raise (name) {
    return new this(`Cannot find database row for ${name} model`, 404, 'E_MISSING_DATABASE_ROW', this.repo)
  }
}

/**
 * Class to throw exceptions related to model
 * relations
 *
 * @class ModelRelationException
 * @constructor
 */
class ModelRelationException extends GE.LogicalException {
  static get repo () {
    return 'adonisjs/errors'
  }

  /**
   * This exception is raised when an unsupported method
   * is called on a model relation. Naturally `xxx` is
   * not a function will be thrown, but we want to
   * be more explicit that `xxx` is not a method
   * for `yyy` relation.
   *
   * @method unSupportedMethod
   *
   * @param  {String}          method
   * @param  {String}          relation
   *
   * @return {Object}
   */
  static unSupportedMethod (method, relation) {
    return new this(`${method} is not supported by ${relation} relation`, 500, 'E_INVALID_RELATION_METHOD', this.repo)
  }

  /**
   * This exception is raised when related model method is
   * executed for which the model needs to be persisted
   * but is not
   *
   * @method unsavedModelInstance
   *
   * @param  {String}             message
   *
   * @return {Object}
   */
  static unsavedModelInstance (message) {
    return new this(message, 500, 'E_UNSAVED_MODEL_INSTANCE')
  }

  /**
   * Exception thrown when trying to set flags on pivot
   * model instance and when pivotModel is explicitly
   * defined
   *
   * @method pivotModelIsDefined
   *
   * @param  {String}            method
   *
   * @return {Object}
   */
  static pivotModelIsDefined (method) {
    return new this(`Cannot call ${method} since pivotModel has been defined`, 500, 'E_INVALID_RELATION_METHOD', this.repo)
  }
}

module.exports = {
  RuntimeException,
  ModelException,
  ModelNotFoundException,
  ModelRelationException
}

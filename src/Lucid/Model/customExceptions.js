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
class ModelNotFoundException extends NE.LogicalException {}
class ModelRelationAssociateException extends NE.LogicalException {}
class ModelRelationSaveException extends NE.LogicalException {}
class ModelRelationAttachException extends NE.LogicalException {}
class ModelRelationDetachException extends NE.LogicalException {}
class ModelRelationNotFound extends NE.LogicalException {}
class ModelRelationException extends NE.LogicalException {}

module.exports = {
  ModelNotFoundException,
  ModelRelationAssociateException,
  ModelRelationSaveException,
  ModelRelationAttachException,
  ModelRelationNotFound,
  ModelRelationException
}

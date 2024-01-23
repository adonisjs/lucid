/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { ModelRelations } from '../../types/relations.js'
import { NamingStrategyContract, LucidModel } from '../../types/model.js'

/**
 * Camelcase naming strategy for the model to use camelcase keys
 * for the serialized output.
 */
export class CamelCaseNamingStrategy implements NamingStrategyContract {
  /**
   * The default table name for the given model
   */
  tableName(model: LucidModel): string {
    return string.pluralize(string.snakeCase(model.name))
  }

  /**
   * The database column name for a given model attribute
   */
  columnName(_: LucidModel, attributeName: string): string {
    return string.snakeCase(attributeName)
  }

  /**
   * The post serialization name for a given model attribute
   */
  serializedName(_: LucidModel, attributeName: string): string {
    return string.camelCase(attributeName)
  }

  /**
   * The local key for a given model relationship
   */
  relationLocalKey(
    relation: ModelRelations<LucidModel, LucidModel>['__opaque_type'],
    model: LucidModel,
    relatedModel: LucidModel
  ): string {
    if (relation === 'belongsTo') {
      return relatedModel.primaryKey
    }

    return model.primaryKey
  }

  /**
   * The foreign key for a given model relationship
   */
  relationForeignKey(
    relation: ModelRelations<LucidModel, LucidModel>['__opaque_type'],
    model: LucidModel,
    relatedModel: LucidModel
  ): string {
    if (relation === 'belongsTo') {
      return string.camelCase(`${relatedModel.name}_${relatedModel.primaryKey}`)
    }

    return string.camelCase(`${model.name}_${model.primaryKey}`)
  }

  /**
   * Pivot table name for many to many relationship
   */
  relationPivotTable(_: 'manyToMany', model: LucidModel, relatedModel: LucidModel): string {
    return string.snakeCase([relatedModel.name, model.name].sort().join('_'))
  }

  /**
   * Pivot foreign key for many to many relationship
   */
  relationPivotForeignKey(_: 'manyToMany', model: LucidModel): string {
    return string.snakeCase(`${model.name}_${model.primaryKey}`)
  }

  /**
   * Keys for the pagination meta
   */
  paginationMetaKeys(): {
    total: string
    perPage: string
    currentPage: string
    lastPage: string
    firstPage: string
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl: string
    previousPageUrl: string
  } {
    return {
      total: 'total',
      perPage: 'perPage',
      currentPage: 'currentPage',
      lastPage: 'lastPage',
      firstPage: 'firstPage',
      firstPageUrl: 'firstPageUrl',
      lastPageUrl: 'lastPageUrl',
      nextPageUrl: 'nextPageUrl',
      previousPageUrl: 'previousPageUrl',
    }
  }
}

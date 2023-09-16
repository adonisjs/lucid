/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import string from '@poppinss/utils/string'
import { ModelRelations } from '../../../adonis-typings/relations.js'
import { NamingStrategyContract, LucidModel } from '../../../adonis-typings/model.js'

/**
 * Uses snake case as the naming strategy for different model properties
 */
export class SnakeCaseNamingStrategy implements NamingStrategyContract {
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
    return string.snakeCase(attributeName)
  }

  /**
   * The local key for a given model relationship
   */
  relationLocalKey(
    relation: ModelRelations['__opaque_type'],
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
    relation: ModelRelations['__opaque_type'],
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
      perPage: 'per_page',
      currentPage: 'current_page',
      lastPage: 'last_page',
      firstPage: 'first_page',
      firstPageUrl: 'first_page_url',
      lastPageUrl: 'last_page_url',
      nextPageUrl: 'next_page_url',
      previousPageUrl: 'previous_page_url',
    }
  }
}

/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

import camelCase from 'camelcase'
import { plural } from 'pluralize'
import { snakeCase } from 'snake-case'
import { ModelRelations } from '@ioc:Adonis/Lucid/Relations'
import { OrmConfigContract, LucidModel } from '@ioc:Adonis/Lucid/Model'

/**
 * The default config for constructing ORM defaults
 */
export const OrmConfig: OrmConfigContract = {
  /**
   * Returns the table name for a given model
   */
  getTableName (model: LucidModel) {
    return plural(snakeCase(model.name))
  },

  /**
   * Returns the column name for a given model attribute
   */
  getColumnName (_: LucidModel, key: string) {
    return snakeCase(key)
  },

  /**
   * Returns the serialized key (toJSON key) name for a given attribute.
   */
  getSerializeAsKey (_: LucidModel, key: string) {
    return snakeCase(key)
  },

  /**
   * Returns the local key for a given relationship
   */
  getLocalKey (
    relation: ModelRelations['type'],
    model: LucidModel,
    related: LucidModel
  ): string {
    if (relation === 'belongsTo') {
      return related.primaryKey
    }

    return model.primaryKey
  },

  /**
   * Returns the foreign key for a given relationship
   */
  getForeignKey (
    relation: ModelRelations['type'],
    model: LucidModel,
    related: LucidModel
  ): string {
    if (relation === 'belongsTo') {
      return camelCase(`${related.name}_${related.primaryKey}`)
    }

    return camelCase(`${model.name}_${model.primaryKey}`)
  },

  /**
   * Returns the pivot table name for manyToMany relationship
   */
  getPivotTableName (
    _: 'manyToMany',
    model: LucidModel,
    relatedModel: LucidModel,
  ): string {
    return snakeCase([relatedModel.name, model.name].sort().join('_'))
  },

  /**
   * Returns the pivot foreign key for manyToMany relationship
   */
  getPivotForeignKey (
    _: 'manyToMany',
    model: LucidModel,
  ): string {
    return snakeCase(`${model.name}_${model.primaryKey}`)
  },
}

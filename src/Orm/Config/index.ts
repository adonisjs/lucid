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
import { TypedRelations } from '@ioc:Adonis/Lucid/Relations'
import { OrmConfigContract, ModelConstructorContract } from '@ioc:Adonis/Lucid/Model'

/**
 * The default config for constructing ORM defaults
 */
export const OrmConfig: OrmConfigContract = {
  /**
   * Returns the table name for a given model
   */
  getTableName (model: ModelConstructorContract) {
    return plural(snakeCase(model.name))
  },

  /**
   * Returns the cast key (the column name) for a given model attribute
   */
  getCastAsKey (_: ModelConstructorContract, key: string) {
    return snakeCase(key)
  },

  /**
   * Returns the serialized key (toJSON key) name for a given attribute.
   */
  getSerializeAsKey (_: ModelConstructorContract, key: string) {
    return snakeCase(key)
  },

  /**
   * Return a flag to turn on or off the serialization of a given column.
   */
  serialize () {
    return true
  },

  /**
   * Returns the local key for a given relationship
   */
  getLocalKey (
    relation: TypedRelations['type'],
    model: ModelConstructorContract,
    related: ModelConstructorContract
  ): string {
    if (relation === 'belongsTo') {
      return related.$primaryKey
    }

    return model.$primaryKey
  },

  /**
   * Returns the foreign key for a given relationship
   */
  getForeignKey (
    relation: TypedRelations['type'],
    model: ModelConstructorContract,
    related: ModelConstructorContract
  ): string {
    if (relation === 'belongsTo') {
      return camelCase(`${related.name}_${related.$primaryKey}`)
    }

    return camelCase(`${model.name}_${model.$primaryKey}`)
  },

  /**
   * Returns the pivot table name for manyToMany relationship
   */
  getPivotTableName (
    _: TypedRelations['type'],
    model: ModelConstructorContract,
    relatedModel: ModelConstructorContract,
  ): string {
    return snakeCase([relatedModel.name, model.name].sort().join('_'))
  },

  /**
   * Returns the pivot foreign key for manyToMany relationship
   */
  getPivotForeignKey (
    _: TypedRelations['type'],
    model: ModelConstructorContract,
  ): string {
    return snakeCase(`${model.name}_${model.$primaryKey}`)
  },
}

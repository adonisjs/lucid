/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { lodash } from '@poppinss/utils'
import { plural } from 'pluralize'
import { ModelRelations } from '@ioc:Adonis/Lucid/Relations'
import { OrmConfig, LucidModel } from '@ioc:Adonis/Lucid/Model'

/**
 * The default config for constructing ORM defaults
 */
export const Config: OrmConfig = {
	/**
	 * Returns the table name for a given model
	 */
	getTableName(model: LucidModel) {
		return plural(lodash.snakeCase(model.name))
	},

	/**
	 * Returns the column name for a given model attribute
	 */
	getColumnName(_: LucidModel, key: string) {
		return lodash.snakeCase(key)
	},

	/**
	 * Returns the serialized key (toJSON key) name for a given attribute.
	 */
	getSerializeAsKey(_: LucidModel, key: string) {
		return lodash.snakeCase(key)
	},

	/**
	 * Returns the local key for a given relationship
	 */
	getLocalKey(relation: ModelRelations['type'], model: LucidModel, related: LucidModel): string {
		if (relation === 'belongsTo') {
			return related.primaryKey
		}

		return model.primaryKey
	},

	/**
	 * Returns the foreign key for a given relationship
	 */
	getForeignKey(relation: ModelRelations['type'], model: LucidModel, related: LucidModel): string {
		if (relation === 'belongsTo') {
			return lodash.camelCase(`${related.name}_${related.primaryKey}`)
		}

		return lodash.camelCase(`${model.name}_${model.primaryKey}`)
	},

	/**
	 * Returns the pivot table name for manyToMany relationship
	 */
	getPivotTableName(_: 'manyToMany', model: LucidModel, relatedModel: LucidModel): string {
		return lodash.snakeCase([relatedModel.name, model.name].sort().join('_'))
	},

	/**
	 * Returns the pivot foreign key for manyToMany relationship
	 */
	getPivotForeignKey(_: 'manyToMany', model: LucidModel): string {
		return lodash.snakeCase(`${model.name}_${model.primaryKey}`)
	},
}

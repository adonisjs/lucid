/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { LucidModel, LucidRow } from '@ioc:Adonis/Lucid/Model'
import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { OneOrMany } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import {
	ThroughRelationOptions,
	HasManyThroughRelationContract,
	HasManyThrough as ModelHasManyThrough,
} from '@ioc:Adonis/Lucid/Relations'

import { KeysExtractor } from '../KeysExtractor'
import { HasManyThroughClient } from './QueryClient'
import { ensureRelationIsBooted } from '../../../utils'
import { HasManyThroughSubQueryBuilder } from './SubQueryBuilder'

/**
 * Manages loading and persisting has many through relationship
 */
export class HasManyThrough implements HasManyThroughRelationContract<LucidModel, LucidModel> {
	public type = 'hasManyThrough' as const

	public booted: boolean = false

	public serializeAs =
		this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs

	public throughModel = this.options.throughModel

	/**
	 * Available after boot is invoked
	 */
	public localKey: string
	public localKeyColumnName: string

	/**
	 * This exists on the through model
	 */
	public foreignKey: string
	public foreignKeyColumnName: string

	/**
	 * This exists on the through model
	 */
	public throughLocalKey: string
	public throughLocalKeyColumnName: string

	/**
	 * This exists on the related model
	 */
	public throughForeignKey: string
	public throughForeignKeyColumnName: string

	/**
	 * Reference to the onQuery hook defined by the user
	 */
	public onQueryHook = this.options.onQuery

	constructor(
		public relationName: string,
		public relatedModel: () => LucidModel,
		private options: ThroughRelationOptions<ModelHasManyThrough<LucidModel>> & {
			throughModel: () => LucidModel
		},
		public model: LucidModel
	) {}

	/**
	 * Returns the alias for the through key
	 */
	public throughAlias(key: string): string {
		return `through_${key}`
	}

	/**
	 * Boot the relationship and ensure that all keys are in
	 * place for queries to do their job.
	 */
	public boot() {
		if (this.booted) {
			return
		}

		/**
		 * Extracting keys from the model and the relation model. The keys
		 * extractor ensures all the required columns are defined on
		 * the models for the relationship to work
		 */
		const { localKey, foreignKey, throughLocalKey, throughForeignKey } = new KeysExtractor(
			this.model,
			this.relationName,
			{
				localKey: {
					model: this.model,
					key:
						this.options.localKey ||
						this.model.$configurator.getLocalKey(this.type, this.model, this.relatedModel()),
				},
				foreignKey: {
					model: this.throughModel(),
					key:
						this.options.foreignKey ||
						this.model.$configurator.getForeignKey(this.type, this.model, this.throughModel()),
				},
				throughLocalKey: {
					model: this.throughModel(),
					key:
						this.options.throughLocalKey ||
						this.model.$configurator.getLocalKey(
							this.type,
							this.throughModel(),
							this.relatedModel()
						),
				},
				throughForeignKey: {
					model: this.relatedModel(),
					key:
						this.options.throughForeignKey ||
						this.model.$configurator.getForeignKey(
							this.type,
							this.throughModel(),
							this.relatedModel()
						),
				},
			}
		).extract()

		/**
		 * Keys on the parent model
		 */
		this.localKey = localKey.attributeName
		this.localKeyColumnName = localKey.columnName

		/**
		 * Keys on the through model
		 */
		this.foreignKey = foreignKey.attributeName
		this.foreignKeyColumnName = foreignKey.columnName

		this.throughLocalKey = throughLocalKey.attributeName
		this.throughLocalKeyColumnName = throughLocalKey.columnName

		this.throughForeignKey = throughForeignKey.attributeName
		this.throughForeignKeyColumnName = throughForeignKey.columnName

		/**
		 * Booted successfully
		 */
		this.booted = true
	}

	/**
	 * Set related model instances
	 */
	public setRelated(parent: LucidRow, related: LucidRow[]): void {
		ensureRelationIsBooted(this)
		parent.$setRelated(this.relationName, related)
	}

	/**
	 * Push related model instance(s)
	 */
	public pushRelated(parent: LucidRow, related: LucidRow | LucidRow[]): void {
		ensureRelationIsBooted(this)
		parent.$pushRelated(this.relationName, related)
	}

	/**
	 * Finds and set the related model instances next to the parent
	 * models.
	 */
	public setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
		ensureRelationIsBooted(this)
		const $foreignCastAsKeyAlias = this.throughAlias(this.foreignKeyColumnName)

		parent.forEach((parentModel) => {
			this.setRelated(
				parentModel,
				related.filter((relatedModel) => {
					const value = parentModel[this.localKey]
					return value !== undefined && relatedModel.$extras[$foreignCastAsKeyAlias] === value
				})
			)
		})
	}

	/**
	 * Returns an instance of query client for invoking queries
	 */
	public client(parent: LucidRow, client: QueryClientContract): any {
		ensureRelationIsBooted(this)
		return new HasManyThroughClient(this, parent, client)
	}

	/**
	 * Returns instance of the eager query
	 */
	public eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract) {
		return HasManyThroughClient.eagerQuery(client, this, parent)
	}

	/**
	 * Returns instance of query builder
	 */
	public subQuery(client: QueryClientContract) {
		const query = new HasManyThroughSubQueryBuilder(client.knexQuery(), client, this as any)
		return query
	}
}

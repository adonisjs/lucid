/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { QueryClientContract } from '@ioc:Adonis/Lucid/Database'
import { OneOrMany } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'
import { LucidModel, LucidRow, ModelObject } from '@ioc:Adonis/Lucid/Model'

import {
	RelationOptions,
	BelongsToRelationContract,
	BelongsTo as ModelBelongsTo,
} from '@ioc:Adonis/Lucid/Relations'

import { KeysExtractor } from '../KeysExtractor'
import { BelongsToQueryClient } from './QueryClient'
import { ensureRelationIsBooted, getValue } from '../../../utils'

/**
 * Manages loading and persisting belongs to relationship
 */
export class BelongsTo implements BelongsToRelationContract<LucidModel, LucidModel> {
	/**
	 * Relationship name
	 */
	public readonly type = 'belongsTo'

	/**
	 * Whether or not the relationship instance has been booted
	 */
	public booted: boolean = false

	/**
	 * The key name for serializing the relationship
	 */
	public serializeAs =
		this.options.serializeAs === undefined ? this.relationName : this.options.serializeAs

	/**
	 * Local key is reference to the primary key in the related table
	 * @note: Available after boot is invoked
	 */
	public localKey: string

	/**
	 * Foreign key is reference to the foreign key in the self table
	 * @note: Available after boot is invoked
	 */
	public foreignKey: string

	/**
	 * Reference to the onQuery hook defined by the user
	 */
	public onQueryHook = this.options.onQuery

	constructor(
		public relationName: string,
		public relatedModel: () => LucidModel,
		private options: RelationOptions<ModelBelongsTo<LucidModel>>,
		public model: LucidModel
	) {}

	/**
	 * Returns a boolean saving related row belongs to the parent
	 * row or not.
	 */
	private isRelatedRow(parent: LucidRow, related: LucidRow) {
		return (
			related[this.localKey] !== undefined && parent[this.foreignKey] === related[this.localKey]
		)
	}

	/**
	 * Boot the relationship and ensure that all keys are in
	 * place for queries to do their job.
	 */
	public boot() {
		if (this.booted) {
			return
		}

		const relatedModel = this.relatedModel()

		/**
		 * Extracting keys from the model and the relation model. The keys
		 * extractor ensures all the required columns are defined on
		 * the models for the relationship to work
		 */
		const { localKey, foreignKey } = new KeysExtractor(this.model, this.relationName, {
			localKey: {
				model: relatedModel,
				key:
					this.options.localKey ||
					this.model.$configurator.getLocalKey(this.type, this.model, relatedModel),
			},
			foreignKey: {
				model: this.model,
				key:
					this.options.foreignKey ||
					this.model.$configurator.getForeignKey(this.type, this.model, relatedModel),
			},
		}).extract()

		/**
		 * Keys on the related model
		 */
		this.localKey = localKey.attributeName

		/**
		 * Keys on the parent model
		 */
		this.foreignKey = foreignKey.attributeName

		/**
		 * Booted successfully
		 */
		this.booted = true
	}

	/**
	 * Set related model instance
	 */
	public setRelated(parent: LucidRow, related: LucidRow | null): void {
		ensureRelationIsBooted(this)
		if (!related) {
			return
		}

		if (!this.isRelatedRow(parent, related)) {
			throw new Error('malformed setRelated call')
		}

		parent.$setRelated(this.relationName, related)
	}

	/**
	 * Push related model instance
	 */
	public pushRelated(parent: LucidRow, related: LucidRow | null): void {
		ensureRelationIsBooted(this)
		if (!related) {
			return
		}

		if (!this.isRelatedRow(parent, related)) {
			throw new Error('malformed pushRelated call')
		}

		parent.$setRelated(this.relationName, related)
	}

	/**
	 * Finds and set the related model instance next to the parent
	 * models.
	 */
	public setRelatedForMany(parent: LucidRow[], related: LucidRow[]): void {
		ensureRelationIsBooted(this)

		parent.forEach((parentRow) => {
			const match = related.find((relatedRow) => this.isRelatedRow(parentRow, relatedRow))
			this.setRelated(parentRow, match || null)
		})
	}

	/**
	 * Returns an instance of query client for the given relationship
	 */
	public client(parent: LucidRow, client: QueryClientContract): any {
		ensureRelationIsBooted(this)
		return new BelongsToQueryClient(this, parent, client)
	}

	/**
	 * Returns instance of the eager query for the relationship
	 */
	public eagerQuery(parent: OneOrMany<LucidRow>, client: QueryClientContract): any {
		ensureRelationIsBooted(this)
		return BelongsToQueryClient.eagerQuery(client, this, parent)
	}

	/**
	 * Hydrates values object for persistance.
	 */
	public hydrateForPersistance(parent: LucidRow, related: ModelObject | LucidRow) {
		parent[this.foreignKey] = getValue(related, this.localKey, this, 'associate')
	}
}

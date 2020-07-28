/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Lucid/Relations' {
	import {
		LucidRow,
		LucidModel,
		ModelObject,
		TypedDecorator,
		ModelAttributes,
		ModelQueryBuilderContract,
	} from '@ioc:Adonis/Lucid/Model'

	import { QueryClientContract, TransactionClientContract } from '@ioc:Adonis/Lucid/Database'

	import {
		OneOrMany,
		StrictValues,
		QueryCallback,
		ChainableContract,
	} from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

	/**
	 * ------------------------------------------------------
	 * Helpers
	 * ------------------------------------------------------
	 */

	/**
	 * Extracts relationship attributes from the model
	 */
	export type ExtractModelRelations<Model extends LucidRow> = {
		[Key in keyof Model]: Model[Key] extends ModelRelations ? Key : never
	}[keyof Model]

	/**
	 * Returns relationship model instance or array of instances based
	 * upon the relationship type
	 */
	export type GetRelationModelInstance<Relation extends ModelRelations> = Relation['type'] extends
		| 'hasOne'
		| 'belongsTo'
		? Relation['instance']
		: Relation['instance'][]

	/**
	 * ------------------------------------------------------
	 * Options
	 * ------------------------------------------------------
	 */

	/**
	 * Options accepted when defining a new relationship. Certain
	 * relationships like `manyToMany` have their own options
	 */
	export type RelationOptions<Related extends ModelRelations> = {
		localKey?: string
		foreignKey?: string
		serializeAs?: string | null
		onQuery?(query: Related['builder']): void
	}

	/**
	 * Options accepted by many to many relationship
	 */
	export type ManyToManyRelationOptions<Related extends ModelRelations> = {
		pivotTable?: string
		localKey?: string
		pivotForeignKey?: string
		relatedKey?: string
		pivotRelatedForeignKey?: string
		pivotColumns?: string[]
		serializeAs?: string
		onQuery?(query: Related['builder']): void
	}

	/**
	 * Options accepted by through relationships
	 */
	export type ThroughRelationOptions<Related extends ModelRelations> = RelationOptions<Related> & {
		throughLocalKey?: string
		throughForeignKey?: string
		throughModel: () => LucidModel
	}

	/**
	 * ------------------------------------------------------
	 * Decorators
	 * ------------------------------------------------------
	 */

	/**
	 * Decorator signature to define has one relationship
	 */
	export type HasOneDecorator = <RelatedModel extends LucidModel>(
		model: () => RelatedModel,
		options?: RelationOptions<HasOne<RelatedModel>>
	) => TypedDecorator<HasOne<RelatedModel>>

	/**
	 * Decorator signature to define has many relationship
	 */
	export type HasManyDecorator = <RelatedModel extends LucidModel>(
		model: () => RelatedModel,
		options?: RelationOptions<HasOne<RelatedModel>>
	) => TypedDecorator<HasMany<RelatedModel>>

	/**
	 * Decorator signature to define belongs to relationship
	 */
	export type BelongsToDecorator = <RelatedModel extends LucidModel>(
		model: () => RelatedModel,
		options?: RelationOptions<HasOne<RelatedModel>>
	) => TypedDecorator<BelongsTo<RelatedModel>>

	/**
	 * Decorator signature to define many to many relationship
	 */
	export type ManyToManyDecorator = <RelatedModel extends LucidModel>(
		model: () => RelatedModel,
		column?: ManyToManyRelationOptions<ManyToMany<RelatedModel>>
	) => TypedDecorator<ManyToMany<RelatedModel>>

	/**
	 * Decorator signature to define has many through relationship
	 */
	export type HasManyThroughDecorator = <RelatedModel extends LucidModel>(
		model: [() => RelatedModel, () => LucidModel],
		column?: Omit<ThroughRelationOptions<HasManyThrough<RelatedModel>>, 'throughModel'>
	) => TypedDecorator<HasManyThrough<RelatedModel>>

	/**
	 * ------------------------------------------------------
	 * Opaque typed relationships
	 * ------------------------------------------------------
	 *
	 * They have no runtime relevance, just a way to distinguish
	 * between standard model properties and relationships
	 *
	 */
	export type ModelRelationTypes = {
		readonly type: 'hasOne' | 'hasMany' | 'belongsTo' | 'manyToMany' | 'hasManyThrough'
	}

	/**
	 * Opaque type for has one relationship
	 */
	export type HasOne<
		RelatedModel extends LucidModel,
		ParentModel extends LucidModel = LucidModel
	> = InstanceType<RelatedModel> & {
		readonly type: 'hasOne'
		model: RelatedModel
		instance: InstanceType<RelatedModel>
		client: HasOneClientContract<HasOneRelationContract<ParentModel, RelatedModel>, RelatedModel>
		builder: RelationQueryBuilderContract<RelatedModel, any>
	}

	/**
	 * Opaque type for has many relationship
	 */
	export type HasMany<
		RelatedModel extends LucidModel,
		ParentModel extends LucidModel = LucidModel
	> = InstanceType<RelatedModel>[] & {
		readonly type: 'hasMany'
		model: RelatedModel
		instance: InstanceType<RelatedModel>
		client: HasManyClientContract<HasManyRelationContract<ParentModel, RelatedModel>, RelatedModel>
		builder: HasManyQueryBuilderContract<RelatedModel, any>
	}

	/**
	 * Opaque type for has belongs to relationship
	 */
	export type BelongsTo<
		RelatedModel extends LucidModel,
		ParentModel extends LucidModel = LucidModel
	> = InstanceType<RelatedModel> & {
		readonly type: 'belongsTo'
		model: RelatedModel
		instance: InstanceType<RelatedModel>
		client: BelongsToClientContract<
			BelongsToRelationContract<ParentModel, RelatedModel>,
			RelatedModel
		>
		builder: RelationQueryBuilderContract<RelatedModel, any>
	}

	/**
	 * Opaque type for many to many relationship
	 */
	export type ManyToMany<
		RelatedModel extends LucidModel,
		ParentModel extends LucidModel = LucidModel
	> = InstanceType<RelatedModel>[] & {
		readonly type: 'manyToMany'
		model: RelatedModel
		instance: InstanceType<RelatedModel>
		client: ManyToManyClientContract<
			ManyToManyRelationContract<ParentModel, RelatedModel>,
			RelatedModel
		>
		builder: ManyToManyQueryBuilderContract<RelatedModel, any>
	}

	/**
	 * Opaque type for many to many relationship
	 */
	export type HasManyThrough<
		RelatedModel extends LucidModel,
		ParentModel extends LucidModel = LucidModel
	> = InstanceType<RelatedModel>[] & {
		readonly type: 'hasManyThrough'
		model: RelatedModel
		instance: InstanceType<RelatedModel>
		client: HasManyThroughClientContract<
			HasManyThroughRelationContract<ParentModel, RelatedModel>,
			RelatedModel
		>
		builder: HasManyThroughQueryBuilderContract<RelatedModel, any>
	}

	/**
	 * These exists on the models directly as a relationship. The idea
	 * is to distinguish relationship properties from other model
	 * properties.
	 */
	type ModelRelations =
		| HasOne<LucidModel, LucidModel>
		| HasMany<LucidModel, LucidModel>
		| BelongsTo<LucidModel, LucidModel>
		| ManyToMany<LucidModel, LucidModel>
		| HasManyThrough<LucidModel, LucidModel>

	/**
	 * ------------------------------------------------------
	 * Relationships
	 * ------------------------------------------------------
	 */

	/**
	 * Interface to be implemented by all relationship types
	 */
	export interface BaseRelationContract<
		ParentModel extends LucidModel,
		RelatedModel extends LucidModel
	> {
		readonly type: ModelRelations['type']
		readonly relationName: string
		readonly serializeAs: string | null
		readonly booted: boolean
		readonly model: ParentModel
		relatedModel(): RelatedModel
		boot(): void

		/**
		 * Get client
		 */
		client(parent: InstanceType<ParentModel>, client: QueryClientContract): unknown

		/**
		 * Get eager query for the relationship
		 */
		eagerQuery(
			parent: OneOrMany<InstanceType<ParentModel>>,
			client: QueryClientContract
		): RelationQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>
	}

	/**
	 * Has one relationship interface
	 */
	export interface HasOneRelationContract<
		ParentModel extends LucidModel,
		RelatedModel extends LucidModel
	> extends BaseRelationContract<ParentModel, RelatedModel> {
		readonly type: 'hasOne'
		readonly localKey: string
		readonly foreignKey: string

		/**
		 * Set related model as a relationship on the parent model.
		 */
		setRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel> | null): void

		/**
		 * Push related model as a relationship on the parent model
		 */
		pushRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel> | null): void

		/**
		 * Set multiple related instances on the multiple parent models.
		 * This method is generally invoked during eager load.
		 *
		 * Fetch 10 users and then all profiles for all 10 users and then
		 * call this method to set related instances
		 */
		setRelatedForMany(
			parent: InstanceType<ParentModel>[],
			related: InstanceType<RelatedModel>[]
		): void

		/**
		 * Returns the query client for one or many model instances. The query
		 * client then be used to fetch and persist relationships.
		 */
		client(
			parent: InstanceType<ParentModel>,
			client: QueryClientContract
		): HasOneClientContract<this, RelatedModel>

		/**
		 * Hydrates related model attributes for persistance
		 */
		hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow): void
	}

	/**
	 * Has many relationship interface
	 */
	export interface HasManyRelationContract<
		ParentModel extends LucidModel,
		RelatedModel extends LucidModel
	> extends BaseRelationContract<ParentModel, RelatedModel> {
		readonly type: 'hasMany'
		readonly localKey: string
		readonly foreignKey: string

		/**
		 * Set related models as a relationship on the parent model
		 */
		setRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel>[]): void

		/**
		 * Push related model(s) as a relationship on the parent model
		 */
		pushRelated(
			parent: InstanceType<ParentModel>,
			related: OneOrMany<InstanceType<RelatedModel>>
		): void

		/**
		 * Set multiple related instances on the multiple parent models.
		 * This method is generally invoked during eager load.
		 *
		 * Fetch 10 users and then all posts for all 10 users and then
		 * call this method to set related instances
		 */
		setRelatedForMany(
			parent: InstanceType<ParentModel>[],
			related: InstanceType<RelatedModel>[]
		): void

		/**
		 * Returns the query client for one or many model instances. The query
		 * client then be used to fetch and persist relationships.
		 */
		client(
			parent: InstanceType<ParentModel>,
			client: QueryClientContract
		): HasManyClientContract<this, RelatedModel>

		/**
		 * Hydrates related model attributes for persistance
		 */
		hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow): void
	}

	/**
	 * Belongs to relationship interface
	 */
	export interface BelongsToRelationContract<
		ParentModel extends LucidModel,
		RelatedModel extends LucidModel
	> extends BaseRelationContract<ParentModel, RelatedModel> {
		readonly type: 'belongsTo'
		readonly localKey: string
		readonly foreignKey: string

		/**
		 * Set related model as a relationship on the parent model
		 */
		setRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel> | null): void

		/**
		 * Push related model as a relationship on the parent model
		 */
		pushRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel> | null): void

		/**
		 * Set multiple related instances on the multiple parent models.
		 * This method is generally invoked during eager load.
		 *
		 * Fetch 10 profiles and then users for all 10 profiles and then
		 * call this method to set related instances
		 */
		setRelatedForMany(
			parent: InstanceType<ParentModel>[],
			related: InstanceType<RelatedModel>[]
		): void

		/**
		 * Returns the query client for a model instance
		 */
		client(
			parent: InstanceType<ParentModel>,
			client: QueryClientContract
		): BelongsToClientContract<this, RelatedModel>

		/**
		 * Hydrates parent model attributes for persistance
		 */
		hydrateForPersistance(parent: LucidRow, values: ModelObject | LucidRow): void
	}

	/**
	 * Many to many relationship interface
	 */
	export interface ManyToManyRelationContract<
		ParentModel extends LucidModel,
		RelatedModel extends LucidModel
	> extends BaseRelationContract<ParentModel, RelatedModel> {
		type: 'manyToMany'

		readonly localKey: string
		readonly relatedKey: string
		readonly pivotForeignKey: string
		readonly pivotRelatedForeignKey: string
		readonly pivotTable: string

		/**
		 * Set related models as a relationship on the parent model
		 */
		setRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel>[]): void

		/**
		 * Push related model(s) as a relationship on the parent model
		 */
		pushRelated(
			parent: InstanceType<ParentModel>,
			related: OneOrMany<InstanceType<RelatedModel>>
		): void

		/**
		 * Set multiple related instances on the multiple parent models.
		 * This method is generally invoked during eager load.
		 */
		setRelatedForMany(
			parent: InstanceType<ParentModel>[],
			related: InstanceType<RelatedModel>[]
		): void

		/**
		 * Returns the query client for one model instance
		 */
		client(
			parent: InstanceType<ParentModel>,
			client: QueryClientContract
		): ManyToManyClientContract<this, RelatedModel>

		/**
		 * Get eager query for the relationship
		 */
		eagerQuery(
			parent: OneOrMany<InstanceType<ParentModel>>,
			client: QueryClientContract
		): ManyToManyQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>

		/**
		 * Returns key-value pair for the pivot table in relation to the parent model
		 */
		getPivotPair(parent: LucidRow): [string, number | string]

		/**
		 * Returns key-value pair for the pivot table in relation to the related model
		 */
		getPivotRelatedPair(related: LucidRow): [string, number | string]
	}

	/**
	 * Has many through relationship interface
	 */
	export interface HasManyThroughRelationContract<
		ParentModel extends LucidModel,
		RelatedModel extends LucidModel
	> extends BaseRelationContract<ParentModel, RelatedModel> {
		type: 'hasManyThrough'
		readonly localKey: string
		readonly foreignKey: string
		readonly throughLocalKey: string
		readonly throughForeignKey: string

		/**
		 * Set related models as a relationship on the parent model
		 */
		setRelated(parent: InstanceType<ParentModel>, related: InstanceType<RelatedModel>[]): void

		/**
		 * Push related model(s) as a relationship on the parent model
		 */
		pushRelated(
			parent: InstanceType<ParentModel>,
			related: InstanceType<RelatedModel> | InstanceType<RelatedModel>[]
		): void

		/**
		 * Set multiple related instances on the multiple parent models.
		 * This method is generally invoked during eager load.
		 */
		setRelatedForMany(
			parent: InstanceType<ParentModel>[],
			related: InstanceType<RelatedModel>[]
		): void

		/**
		 * Returns the query client for a model instance
		 */
		client(
			model: InstanceType<ParentModel>,
			client: QueryClientContract
		): RelationQueryClientContract<this, RelatedModel>
	}

	/**
	 * A union of relationships
	 */
	export type RelationshipsContract =
		| HasOneRelationContract<LucidModel, LucidModel>
		| HasManyRelationContract<LucidModel, LucidModel>
		| BelongsToRelationContract<LucidModel, LucidModel>
		| ManyToManyRelationContract<LucidModel, LucidModel>
		| HasManyThroughRelationContract<LucidModel, LucidModel>

	/**
	 * ------------------------------------------------------
	 * Relationships query client
	 * ------------------------------------------------------
	 */
	export interface RelationQueryClientContract<
		Relation extends RelationshipsContract,
		RelatedModel extends LucidModel
	> {
		relation: Relation

		/**
		 * Return a query builder instance of the relationship
		 */
		query<Result extends any = InstanceType<RelatedModel>>(): RelationQueryBuilderContract<
			RelatedModel,
			Result
		>
	}

	/**
	 * Query client for has one relationship
	 */
	export interface HasOneClientContract<
		Relation extends RelationshipsContract,
		RelatedModel extends LucidModel
	> extends RelationQueryClientContract<Relation, RelatedModel> {
		/**
		 * Save related instance. Sets up the FK automatically
		 */
		save(related: InstanceType<RelatedModel>): Promise<void>

		/**
		 * Create related instance. Sets up the FK automatically
		 */
		create(
			values: Partial<ModelAttributes<InstanceType<RelatedModel>>>
		): Promise<InstanceType<RelatedModel>>

		/**
		 * Return first or create related instance
		 */
		firstOrCreate(
			search: Partial<ModelAttributes<InstanceType<RelatedModel>>>,
			savePayload?: Partial<ModelAttributes<InstanceType<RelatedModel>>>
		): Promise<InstanceType<RelatedModel>>

		/**
		 * Update or create related instance
		 */
		updateOrCreate(
			search: Partial<ModelAttributes<InstanceType<RelatedModel>>>,
			updatePayload: Partial<ModelAttributes<InstanceType<RelatedModel>>>
		): Promise<InstanceType<RelatedModel>>
	}

	/**
	 * Query client for has many relationship. Extends hasOne and
	 * adds support for saving many relations
	 */
	export interface HasManyClientContract<
		Relation extends RelationshipsContract,
		RelatedModel extends LucidModel
	> extends HasOneClientContract<Relation, RelatedModel> {
		/**
		 * Save many of related instances. Sets up FK automatically
		 */
		saveMany(related: InstanceType<RelatedModel>[]): Promise<void>

		/**
		 * Create many of related instances. Sets up FK automatically
		 */
		createMany(
			values: Partial<ModelAttributes<InstanceType<RelatedModel>>>[]
		): Promise<InstanceType<RelatedModel>[]>

		/**
		 * Return a query builder instance of the relationship
		 */
		query<Result extends any = InstanceType<RelatedModel>>(): HasManyQueryBuilderContract<
			RelatedModel,
			Result
		>
	}

	/**
	 * Query client for belongs to relationship. Uses `associate` and
	 * `dissociate` over save.
	 */
	export interface BelongsToClientContract<
		Relation extends RelationshipsContract,
		RelatedModel extends LucidModel
	> extends RelationQueryClientContract<Relation, RelatedModel> {
		/**
		 * Associate related instance
		 */
		associate(related: InstanceType<RelatedModel>): Promise<void>

		/**
		 * Dissociate related instance
		 */
		dissociate(): Promise<void>
	}

	/**
	 * Query client for many to many relationship.
	 */
	export interface ManyToManyClientContract<
		Relation extends RelationshipsContract,
		RelatedModel extends LucidModel
	> extends RelationQueryClientContract<Relation, RelatedModel> {
		/**
		 * Returns related model query builder instance
		 */
		query<Result extends any = InstanceType<RelatedModel>>(): ManyToManyQueryBuilderContract<
			RelatedModel,
			Result
		>

		/**
		 * Pivot query just targets the pivot table without any joins
		 */
		pivotQuery<Result extends any = any>(): ManyToManyQueryBuilderContract<RelatedModel, Result>

		/**
		 * Save related model instance. Sets up FK automatically
		 */
		save(related: InstanceType<RelatedModel>, checkExisting?: boolean): Promise<void>

		/**
		 * Save many of related model instance. Sets up FK automatically
		 */
		saveMany(related: InstanceType<RelatedModel>[], checkExisting?: boolean): Promise<void>

		/**
		 * Create related model instance. Sets up FK automatically
		 */
		create(
			values: Partial<ModelAttributes<InstanceType<RelatedModel>>>,
			checkExisting?: boolean
		): Promise<InstanceType<RelatedModel>>

		/**
		 * Create many of related model instances. Sets up FK automatically
		 */
		createMany(
			values: Partial<ModelAttributes<InstanceType<RelatedModel>>>[],
			checkExisting?: boolean
		): Promise<InstanceType<RelatedModel>[]>

		/**
		 * Attach new pivot rows
		 */
		attach(
			ids: (string | number)[] | { [key: string]: ModelObject },
			trx?: TransactionClientContract
		): Promise<void>

		/**
		 * Detach existing pivot rows
		 */
		detach(ids?: (string | number)[], trx?: TransactionClientContract): Promise<void>

		/**
		 * Sync pivot rows.
		 */
		sync(
			ids: (string | number)[] | { [key: string]: ModelObject },
			detach?: boolean,
			trx?: TransactionClientContract
		): Promise<void>
	}

	/**
	 * HasMany through client contract. HasMany through doesn't
	 * allow persisting relationships. Use the direct relation
	 * for that.
	 */
	export interface HasManyThroughClientContract<
		Relation extends RelationshipsContract,
		RelatedModel extends LucidModel
	> extends RelationQueryClientContract<Relation, RelatedModel> {
		/**
		 * Return a query builder instance of the relationship
		 */
		query<Result extends any = InstanceType<RelatedModel>>(): HasManyThroughQueryBuilderContract<
			RelatedModel,
			Result
		>
	}

	/**
	 * ------------------------------------------------------
	 * Relationships query builders
	 * ------------------------------------------------------
	 */

	/**
	 * Base query builder for all relations
	 */
	export interface RelationQueryBuilderContract<Related extends LucidModel, Result extends any>
		extends ModelQueryBuilderContract<Related, Result> {
		isEagerQuery: boolean
		selectRelationKeys(): this
	}

	/**
	 * Has many query builder contract
	 */
	export interface HasManyQueryBuilderContract<Related extends LucidModel, Result extends any>
		extends RelationQueryBuilderContract<Related, Result> {
		groupLimit(limit: number): this
		groupOrderBy(column: string, direction?: 'asc' | 'desc'): this
	}

	/**
	 * Has many query through builder contract
	 */
	export interface HasManyThroughQueryBuilderContract<
		Related extends LucidModel,
		Result extends any
	> extends RelationQueryBuilderContract<Related, Result> {
		groupLimit(limit: number): this
		groupOrderBy(column: string, direction?: 'asc' | 'desc'): this
	}

	/**
	 * Possible signatures for adding a where clause
	 */
	interface WherePivot<Builder extends ChainableContract> {
		(key: string, value: StrictValues | ChainableContract): Builder
		(key: string, operator: string, value: StrictValues | ChainableContract): Builder
	}

	/**
	 * Possible signatures for adding where in clause.
	 */
	interface WhereInPivot<Builder extends ChainableContract> {
		(K: string, value: (StrictValues | ChainableContract)[]): Builder
		(K: string[], value: (StrictValues | ChainableContract)[][]): Builder
		(k: string, subquery: ChainableContract | QueryCallback<Builder>): Builder
		(k: string[], subquery: ChainableContract): Builder
	}

	/**
	 * Shape of many to many query builder. It has few methods over the standard
	 * model query builder
	 */
	export interface ManyToManyQueryBuilderContract<Related extends LucidModel, Result extends any>
		extends RelationQueryBuilderContract<Related, Result> {
		groupLimit(limit: number): this
		groupOrderBy(column: string, direction?: 'asc' | 'desc'): this

		pivotColumns(columns: string[]): this
		isPivotOnlyQuery: boolean

		wherePivot: WherePivot<this>
		orWherePivot: WherePivot<this>
		andWherePivot: WherePivot<this>

		whereNotPivot: WherePivot<this>
		orWhereNotPivot: WherePivot<this>
		andWhereNotPivot: WherePivot<this>

		whereInPivot: WhereInPivot<this>
		orWhereInPivot: WhereInPivot<this>
		andWhereInPivot: WhereInPivot<this>

		whereNotInPivot: WhereInPivot<this>
		orWhereNotInPivot: WhereInPivot<this>
		andWhereNotInPivot: WhereInPivot<this>
	}

	/**
	 * ------------------------------------------------------
	 * Preloader
	 * ------------------------------------------------------
	 */

	/**
	 * The preload function
	 */
	export interface QueryBuilderPreloadFn<Model extends LucidRow, Builder extends any> {
		<
			Name extends ExtractModelRelations<Model>,
			RelatedBuilder = Model[Name] extends ModelRelations ? Model[Name]['builder'] : never
		>(
			relation: Name,
			callback?: (builder: RelatedBuilder) => void
		): Builder
	}

	/**
	 * Shape of the preloader to preload relationships
	 */
	export interface PreloaderContract<Model extends LucidRow> {
		processAllForOne(parent: Model, client: QueryClientContract): Promise<void>
		processAllForMany(parent: Model[], client: QueryClientContract): Promise<void>
		preload: QueryBuilderPreloadFn<Model, this>
		sideload(values: ModelObject): this
	}
}

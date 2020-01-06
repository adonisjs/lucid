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
    ModelObject,
    ModelContract,
    ModelConstructorContract,
    ModelQueryBuilderContract,
  } from '@ioc:Adonis/Lucid/Model'

  import {
    QueryClientContract,
    ExcutableQueryBuilderContract,
  } from '@ioc:Adonis/Lucid/Database'

  import {
    StrictValues,
    QueryCallback,
    ChainableContract,
  } from '@ioc:Adonis/Lucid/DatabaseQueryBuilder'

  /**
   * Options accepted when defining a new relationship. Certain
   * relationships like `manyToMany` have their own options
   */
  export type RelationOptions = {
    relatedModel: (() => ModelConstructorContract),
    localKey?: string,
    foreignKey?: string,
    serializeAs?: string,
  }

  /**
   * Options accepted by many to many relationship
   */
  export type ManyToManyRelationOptions = {
    relatedModel: (() => ModelConstructorContract),
    pivotTable?: string,
    localKey?: string,
    pivotForeignKey?: string,
    relatedKey?: string,
    pivotRelatedForeignKey?: string,
    pivotColumns?: string[],
    serializeAs?: string,
  }

  /**
   * Options accepted by through relationships
   */
  export type ThroughRelationOptions = RelationOptions & {
    throughModel: (() => ModelConstructorContract)
    throughLocalKey?: string,
    throughForeignKey?: string,
  }

  /**
   * ------------------------------------------------------
   * Decorators
   * ------------------------------------------------------
   */

  /**
   * Decorator signature to define has one relationship
   */
  export type HasOneDecorator = (
    model: RelationOptions['relatedModel'],
    options?: Omit<RelationOptions, 'relatedModel'>,
  ) => (target, property) => void

  /**
   * Decorator signature to define has many relationship
   */
  export type HasManyDecorator = (
    model: RelationOptions['relatedModel'],
    options?: Omit<RelationOptions, 'relatedModel'>,
  ) => (target, property) => void

  /**
   * Decorator signature to define belongs to relationship
   */
  export type BelongsToDecorator = (
    model: RelationOptions['relatedModel'],
    options?: Omit<RelationOptions, 'relatedModel'>,
  ) => (target, property) => void

  /**
   * Decorator signature to define many to many relationship
   */
  export type ManyToManyDecorator = (
    model: ManyToManyRelationOptions['relatedModel'],
    column?: Omit<ManyToManyRelationOptions, 'relatedModel'>,
  ) => (target, property) => void

  /**
   * Decorator signature to define has many through relationship
   */
  export type HasManyThroughDecorator = (
    model: [ThroughRelationOptions['relatedModel'], ThroughRelationOptions['throughModel']],
    column?: Omit<ThroughRelationOptions, 'relatedModel' | 'throughModel'>,
  ) => (target, property) => void

  /**
   * ------------------------------------------------------
   * Opaque typed relationships
   * ------------------------------------------------------
   */

  /**
   * Opaque type for has one relationship
   */
  export type HasOne<
    Related extends ModelContract,
    Model extends ModelConstructorContract = ModelConstructorContract
  > = Related & {
    type: 'hasOne',
    model: ModelConstructorContract<Related>,
    instance: Related,
    relation: HasOneRelationContract<Model, ModelConstructorContract<Related>>
  }

  /**
   * Opaque type for has many relationship
   */
  export type HasMany<
    Related extends ModelContract,
    Model extends ModelConstructorContract = ModelConstructorContract
  > = Related[] & {
    type: 'hasMany',
    model: ModelConstructorContract<Related>,
    instance: Related,
    relation: HasManyRelationContract<Model, ModelConstructorContract<Related>>
  }

  /**
   * Opaque type for has belongs to relationship
   */
  export type BelongsTo<
    Related extends ModelContract,
    Model extends ModelConstructorContract = ModelConstructorContract
  > = Related & {
    type: 'belongsTo',
    model: ModelConstructorContract<Related>,
    instance: Related,
    relation: BelongsToRelationContract<Model, ModelConstructorContract<Related>>
  }

  /**
   * Opaque type for many to many relationship
   */
  export type ManyToMany<
    Related extends ModelContract,
    Model extends ModelConstructorContract = ModelConstructorContract
  > = Related[] & {
    type: 'manyToMany',
    model: ModelConstructorContract<Related>,
    instance: Related,
    relation: ManyToManyRelationContract<Model, ModelConstructorContract<Related>>
  }

  /**
   * Opaque type for many to many relationship
   */
  export type HasManyThrough<
    Related extends ModelContract,
    Model extends ModelConstructorContract = ModelConstructorContract
  > = Related[] & {
    type: 'hasManyThrough',
    model: ModelConstructorContract<Related>,
    instance: Related,
    relation: HasManyThroughRelationContract<Model, ModelConstructorContract<Related>>
  }

  /**
   * Possible typed relations
   */
  type TypedRelations =
    HasOne<ModelContract, ModelConstructorContract> |
    HasMany<ModelContract, ModelConstructorContract> |
    BelongsTo<ModelContract, ModelConstructorContract> |
    ManyToMany<ModelContract, ModelConstructorContract> |
    HasManyThrough<ModelContract, ModelConstructorContract>

  /**
   * Returns relationship model instance or array of instances based
   * upon the relationship type
   */
  export type ExtractRelationModel<
    Relation extends TypedRelations,
  > =
    Relation['type'] extends 'hasOne' | 'belongsTo' ? Relation['instance'] : Relation['instance'][]

  /**
   * ------------------------------------------------------
   * Relationships
   * ------------------------------------------------------
   */

  /**
   * Interface to be implemented by all relationship types
   */
  export interface BaseRelationContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > {
    $type: TypedRelations['type']
    $relationName: string
    $serializeAs: string
    $booted: boolean
    $model: Model
    $profilerData: { [key: string]: any },

    $boot (): void
    $relatedModel (): RelatedModel
  }

  /**
   * Has one relationship interface
   */
  export interface HasOneRelationContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends BaseRelationContract<Model, RelatedModel> {
    $type: 'hasOne'

    $setRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | null
    ): void

    $pushRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | null
    ): void

    $setRelatedForMany (
      parent: InstanceType<Model>[],
      related: InstanceType<RelatedModel>[],
    ): void

    /**
     * Returns the query client for one or many model instances
     */
    client (
      model: InstanceType<Model> | InstanceType<Model>[],
      client: QueryClientContract,
    ): HasOneClientContract<Model, RelatedModel>
  }

  /**
   * Has many relationship interface
   */
  export interface HasManyRelationContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends BaseRelationContract<Model, RelatedModel> {
    $type: 'hasMany'

    $setRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel>[]
    ): void

    $pushRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | InstanceType<RelatedModel>[]
    ): void

    $setRelatedForMany (
      parent: InstanceType<Model>[],
      related: InstanceType<RelatedModel>[],
    ): void

    /**
     * Returns the query client for one or many model instances
     */
    client (
      model: InstanceType<Model> | InstanceType<Model>[],
      client: QueryClientContract,
    ): HasManyClientContract<Model, RelatedModel>
  }

  /**
   * Belongs to relationship interface
   */
  export interface BelongsToRelationContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends BaseRelationContract<Model, RelatedModel> {
    $type: 'belongsTo'

    $setRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | null
    ): void

    $pushRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | null
    ): void

    $setRelatedForMany (
      parent: InstanceType<Model>[],
      related: InstanceType<RelatedModel>[],
    ): void

    /**
     * Returns the query client for one or many model instances
     */
    client (
      model: InstanceType<Model> | InstanceType<Model>[],
      client: QueryClientContract,
    ): BelongsToClientContract<Model, RelatedModel>
  }

  /**
   * Many to many relationship interface
   */
  export interface ManyToManyRelationContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends BaseRelationContract<Model, RelatedModel> {
    $type: 'manyToMany'

    $setRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel>[]
    ): void

    $pushRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | InstanceType<RelatedModel>[]
    ): void

    $setRelatedForMany (
      parent: InstanceType<Model>[],
      related: InstanceType<RelatedModel>[],
    ): void

    /**
     * Returns the query client for one or many model instances
     */
    client (
      model: InstanceType<Model> | InstanceType<Model>[],
      client: QueryClientContract,
    ): ManyToManyClientContract<Model, RelatedModel>
  }

  /**
   * Has many through relationship interface
   */
  export interface HasManyThroughRelationContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends BaseRelationContract<Model, RelatedModel> {
    $type: 'hasManyThrough'

    $setRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel>[]
    ): void

    $pushRelated (
      parent: InstanceType<Model>,
      related: InstanceType<RelatedModel> | InstanceType<RelatedModel>[]
    ): void

    $setRelatedForMany (
      parent: InstanceType<Model>[],
      related: InstanceType<RelatedModel>[],
    ): void

    /**
     * Returns the query client for one or many model instances
     */
    client (
      model: InstanceType<Model> | InstanceType<Model>[],
      client: QueryClientContract,
    ): RelationBaseQueryClientContract<Model, RelatedModel>
  }

  /**
   * A union of relationships
   */
  export type RelationshipsContract =
    HasOneRelationContract<ModelConstructorContract, ModelConstructorContract> |
    HasManyRelationContract<ModelConstructorContract, ModelConstructorContract> |
    BelongsToRelationContract<ModelConstructorContract, ModelConstructorContract> |
    ManyToManyRelationContract<ModelConstructorContract, ModelConstructorContract> |
    HasManyThroughRelationContract<ModelConstructorContract, ModelConstructorContract>

  /**
   * ------------------------------------------------------
   * Relationships query client
   * ------------------------------------------------------
   */
  export interface RelationBaseQueryClientContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > {
    query (): RelationBaseQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>
    & ExcutableQueryBuilderContract<InstanceType<RelatedModel>[]>

    /**
     * Eager query only works when client instance is created using multiple
     * parent model instances
     */
    eagerQuery (): RelationBaseQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>
    & ExcutableQueryBuilderContract<InstanceType<RelatedModel>[]>
  }

  /**
   * Query client for has one relationship
   */
  export interface HasOneClientContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends RelationBaseQueryClientContract<Model, RelatedModel> {
    save (related: InstanceType<RelatedModel>): Promise<void>
    create (values: ModelObject): Promise<InstanceType<RelatedModel>>

    firstOrCreate (search: ModelObject, savePayload?: ModelObject): Promise<InstanceType<RelatedModel>>
    updateOrCreate (search: ModelObject, updatePayload: ModelObject): Promise<InstanceType<RelatedModel>>
  }

  /**
   * Query client for has many relationship. Extends hasOne and
   * adds support for saving many relations
   */
  export interface HasManyClientContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends HasOneClientContract<Model, RelatedModel> {
    saveMany (related: InstanceType<RelatedModel>[]): Promise<void>
    createMany (values: ModelObject[]): Promise<InstanceType<RelatedModel>[]>
  }

  /**
   * Query client for belongs to relationship. Uses `associate` and
   * `dissociate` over save.
   */
  export interface BelongsToClientContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > extends RelationBaseQueryClientContract<Model, RelatedModel> {
    associate (related: InstanceType<RelatedModel>): Promise<void>
    dissociate (): Promise<void>
  }

  /**
   * Query client for many to many relationship.
   */
  export interface ManyToManyClientContract<
    Model extends ModelConstructorContract,
    RelatedModel extends ModelConstructorContract
  > {
    query (): ManyToManyQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>
    & ExcutableQueryBuilderContract<InstanceType<RelatedModel>[]>

    /**
     * Eager query only works when client instance is created using multiple
     * parent model instances
     */
    eagerQuery (): ManyToManyQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>
    & ExcutableQueryBuilderContract<InstanceType<RelatedModel>[]>

    /**
     * Pivot query just targets the pivot table without any joins
     */
    pivotQuery (): ManyToManyQueryBuilderContract<RelatedModel, InstanceType<RelatedModel>>
    & ExcutableQueryBuilderContract<InstanceType<RelatedModel>[]>

    save (related: InstanceType<RelatedModel>, checkExisting?: boolean): Promise<void>
    create (values: ModelObject): Promise<InstanceType<RelatedModel>>

    saveMany (related: InstanceType<RelatedModel>[]): Promise<void>
    createMany (values: ModelObject[]): Promise<InstanceType<RelatedModel>[]>

    attach (ids: (string | number)[] | { [key: string]: ModelObject }): Promise<void>
    detach (ids: (string | number)[]): Promise<void>

    sync (ids: (string | number)[] | { [key: string]: ModelObject }, checkExisting?: boolean): Promise<void>
  }

  /**
   * ------------------------------------------------------
   * Relationships query builders
   * ------------------------------------------------------
   */

  /**
   * Base query builder for all relations
   */
  export interface RelationBaseQueryBuilderContract<
    Related extends ModelConstructorContract,
    Result extends any = InstanceType<Related>
  > extends ModelQueryBuilderContract<Related, Result> {
    applyConstraints (): void
    selectRelationKeys (): this
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
  export interface ManyToManyQueryBuilderContract<
    Related extends ModelConstructorContract,
    Result extends any = InstanceType<Related>
  > extends RelationBaseQueryBuilderContract<Related, Result> {
    pivotColumns (columns: string[]): this

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
  export interface QueryBuilderPreloadFn<Model extends ModelContract, Builder extends any> {
    /**
     * If Typescript were to support high order generics. The life would
     * have been a lot better
     */
    <
      Name extends keyof ExtractRelations<Model>,
      RelationType extends TypedRelations = Model[Name] extends TypedRelations ? Model[Name] : never,
    > (
      relation: Name,
      callback?: (
        builder: ReturnType<ReturnType<RelationType['relation']['client']>['eagerQuery']>,
      ) => void,
    ): Builder
  }

  /**
   * Shape of the preloader to preload relationships
   */
  export interface PreloaderContract<Model extends ModelContract> {
    processAllForOne (parent: Model, client: QueryClientContract): Promise<void>
    processAllForMany (parent: Model[], client: QueryClientContract): Promise<void>
    preload: QueryBuilderPreloadFn<Model, this>
    sideload (values: ModelObject): this
  }

  /**
   * ------------------------------------------------------
   * Helpers
   * ------------------------------------------------------
   */

  /**
   * Extract defined relationships from a model class
   */
  export type ExtractRelations<Model extends ModelContract> = {
    [FilteredKey in {
      [Key in keyof Model]: Model[Key] extends TypedRelations ? Key : never
    }[keyof Model]]: string
  }
}

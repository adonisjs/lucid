/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AppFactory } from '@adonisjs/core/factories/app'

import type { LucidModel, LucidRow, OptionalTypedDecorator } from '../../src/types/model.js'
import type { QueryClientContract } from '../../src/types/database.js'
import type {
  BaseRelationContract,
  BelongsTo,
  ExtractModelRelations,
  GetRelationModelInstance,
  HasMany,
  HasManyThrough,
  HasOne,
  ManyToMany,
  RelationOptions,
  RelationQueryClientContract,
  RelationshipsContract,
  RelationQueryBuilderContract,
  RelationSubQueryBuilderContract,
  ValidatedCustomOpaqueRelations,
} from '../../src/types/relations.js'
import {
  BaseModel as BaseModelRef,
  RelationRegistry,
  createRelationDecorator,
  column,
} from '../../src/orm/main.js'
import {
  getDb,
  setup,
  cleanup,
  getBaseModel,
  ormAdapter,
  resetTables,
} from '../../test-helpers/index.js'

/**
 * The contract a third-party package publishes. It pins "type" and "isMany"
 * to literals, which is what keeps "RelationshipsContract" narrowable.
 */
interface MorphToRelationContract<
  ParentModel extends LucidModel,
  RelatedModel extends LucidModel,
> extends BaseRelationContract<ParentModel, RelatedModel, 'morphTo', false> {
  readonly morphType: string
}

type ModelMorphTo<
  RelatedModel extends LucidModel,
  ParentModel extends LucidModel = LucidModel,
> = InstanceType<RelatedModel> & {
  readonly __opaque_type: 'morphTo'
  model: RelatedModel
  instance: InstanceType<RelatedModel>
  client: RelationQueryClientContract<
    MorphToRelationContract<ParentModel, RelatedModel>,
    RelatedModel
  >
  builder: RelationQueryBuilderContract<RelatedModel, any>
  subQuery: RelationSubQueryBuilderContract<RelatedModel>
}

type Ancestors<
  RelatedModel extends LucidModel,
  ParentModel extends LucidModel = LucidModel,
> = InstanceType<RelatedModel>[] & {
  readonly __opaque_type: 'ancestors'
  model: RelatedModel
  instance: InstanceType<RelatedModel>
  client: RelationQueryClientContract<
    BaseRelationContract<ParentModel, RelatedModel, 'ancestors', true>,
    RelatedModel
  >
  builder: RelationQueryBuilderContract<RelatedModel, any>
  subQuery: RelationSubQueryBuilderContract<RelatedModel>
}

type MorphToDecorator = <RelatedModel extends LucidModel>(
  model: () => RelatedModel,
  options?: RelationOptions<RelatedModel, LucidModel, ModelMorphTo<RelatedModel>>
) => OptionalTypedDecorator<ModelMorphTo<RelatedModel> | null>

/**
 * The key MUST match the contract's "type", otherwise the entry is discarded
 */
declare module '../../src/types/relations.js' {
  interface KnownCustomRelations {
    morphTo: MorphToRelationContract<LucidModel, LucidModel>
    ancestors: BaseRelationContract<LucidModel, LucidModel, 'ancestors', true>
  }

  interface KnownCustomOpaqueRelations<
    RelatedModel extends LucidModel,
    ParentModel extends LucidModel,
  > {
    morphTo: ModelMorphTo<RelatedModel, ParentModel>
    ancestors: Ancestors<RelatedModel, ParentModel>
    mismatched: { readonly __opaque_type: 'wrongKey' }
  }
}

/**
 * A minimal working implementation of the contract above
 */
class MorphTo implements MorphToRelationContract<LucidModel, LucidModel> {
  readonly type = 'morphTo' as const
  readonly isMany = false as const
  readonly morphType: string

  booted = false
  serializeAs: string | null
  relationName: string
  model: LucidModel

  constructor(
    relationName: string,
    private related: () => LucidModel,
    private options: any,
    model: LucidModel
  ) {
    this.relationName = relationName
    this.serializeAs = options?.serializeAs ?? relationName
    this.morphType = options?.morphType ?? 'owner_type'
    this.model = model
  }

  relatedModel() {
    return this.related()
  }

  boot() {
    this.booted = true
  }

  clone(parent: LucidModel): this {
    return new MorphTo(this.relationName, this.related, this.options, parent) as this
  }

  setRelated(parent: LucidRow, related: LucidRow | null) {
    parent.$setRelated(this.relationName as any, related as any)
  }

  pushRelated(parent: LucidRow, related: LucidRow | null) {
    parent.$pushRelated(this.relationName as any, related as any)
  }

  setRelatedForMany(parents: LucidRow[], related: LucidRow[]) {
    parents.forEach((parent, index) => this.setRelated(parent, related[index] ?? null))
  }

  client(
    parent: LucidRow,
    client: QueryClientContract
  ): RelationQueryClientContract<this, LucidModel> {
    return {
      relation: this,
      query: () => this.eagerQuery(parent, client),
    }
  }

  eagerQuery(
    _parent: LucidRow | LucidRow[],
    client: QueryClientContract
  ): RelationQueryBuilderContract<LucidModel, any> {
    const query: any = this.relatedModel().query({ client })
    query.selectRelationKeys = () => query
    return query
  }

  subQuery(_client: QueryClientContract): RelationSubQueryBuilderContract<LucidModel> {
    return null as any
  }
}

test.group('Custom relations', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  /**
   * Isolation by replacement, not by mutation: each test gets a registry that
   * already knows the built-ins and nothing else.
   */
  group.each.setup(() => {
    const previous = BaseModelRef.$relationRegistry
    BaseModelRef.$relationRegistry = new RelationRegistry()
    return () => {
      BaseModelRef.$relationRegistry = previous
    }
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('preload a custom singular relation on a single parent', async ({
    fs,
    assert,
    expectTypeOf,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const BaseModel = getBaseModel(ormAdapter(db))

    BaseModel.$relationRegistry.register('morphTo', {
      create: (name, relatedModel, options, model) =>
        new MorphTo(name, relatedModel, options, model),
    })

    const morphTo: MorphToDecorator = createRelationDecorator('morphTo')

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @morphTo(() => User, {
        onQuery(query) {
          expectTypeOf(query).toEqualTypeOf<
            | RelationQueryBuilderContract<typeof User, any>
            | RelationSubQueryBuilderContract<typeof User>
          >()
        },
      })
      declare owner: ModelMorphTo<typeof User> | null
    }
    User.boot()

    await db.table('users').multiInsert([{ username: 'virk' }, { username: 'romain' }])

    const user = await User.query().orderBy('id', 'asc').firstOrFail()
    await user.load('owner', (query) => {
      expectTypeOf(query).toEqualTypeOf<RelationQueryBuilderContract<typeof User, any>>()
    })
    expectTypeOf<ExtractModelRelations<User>>().toEqualTypeOf<'owner' | undefined>()
    expectTypeOf(user.related('owner').query()).toEqualTypeOf<
      RelationQueryBuilderContract<typeof User, User>
    >()

    /**
     * Regression guard: this used to throw
     *   "User.owner" cannot reference more than one instance of "User" model
     */
    assert.isFalse(Array.isArray(user.owner))
    assert.instanceOf(user.owner, User)
  })

  test('preload a custom singular relation across many parents', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const BaseModel = getBaseModel(ormAdapter(db))

    BaseModel.$relationRegistry.register('morphTo', {
      create: (name, relatedModel, options, model) =>
        new MorphTo(name, relatedModel, options, model),
    })

    const morphTo: MorphToDecorator = createRelationDecorator('morphTo')

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @morphTo(() => User)
      declare owner: ModelMorphTo<typeof User> | null
    }
    User.boot()

    await db.table('users').multiInsert([{ username: 'virk' }, { username: 'romain' }])

    const users = await User.query().orderBy('id', 'asc').preload('owner')

    assert.lengthOf(users, 2)
    users.forEach((one) => assert.isFalse(Array.isArray(one.owner)))
  })

  test('infer instances for singular and many relations', ({ expectTypeOf }) => {
    class User extends BaseModelRef {
      declare username: string
    }

    expectTypeOf<GetRelationModelInstance<ModelMorphTo<typeof User>>>().toEqualTypeOf<User>()
    expectTypeOf<GetRelationModelInstance<Ancestors<typeof User>>>().toEqualTypeOf<User[]>()
    expectTypeOf<GetRelationModelInstance<HasOne<typeof User>>>().toEqualTypeOf<User>()
    expectTypeOf<GetRelationModelInstance<BelongsTo<typeof User>>>().toEqualTypeOf<User>()
    expectTypeOf<GetRelationModelInstance<HasMany<typeof User>>>().toEqualTypeOf<User[]>()
    expectTypeOf<GetRelationModelInstance<ManyToMany<typeof User>>>().toEqualTypeOf<User[]>()
    expectTypeOf<GetRelationModelInstance<HasManyThrough<typeof User>>>().toEqualTypeOf<User[]>()
    expectTypeOf<
      GetRelationModelInstance<ModelMorphTo<typeof User> | Ancestors<typeof User>>
    >().toEqualTypeOf<User | User[]>()
  })

  test('preserve both model parameters and discard mismatched opaque entries', ({
    expectTypeOf,
  }) => {
    class User extends BaseModelRef {
      declare username: string
    }
    class Post extends BaseModelRef {
      declare title: string
    }

    type CustomRelations = ValidatedCustomOpaqueRelations<typeof User, typeof Post>
    expectTypeOf<CustomRelations>().toEqualTypeOf<
      ModelMorphTo<typeof User, typeof Post> | Ancestors<typeof User, typeof Post>
    >()
    expectTypeOf<CustomRelations['__opaque_type']>().toEqualTypeOf<'morphTo' | 'ancestors'>()
    expectTypeOf<
      Extract<CustomRelations, { __opaque_type: 'morphTo' }>['client']['relation']['model']
    >().toEqualTypeOf<typeof Post>()
  })

  test('a registered custom relation does not break discriminant narrowing', async ({ assert }) => {
    /**
     * Regression guard. "morphTo" is registered in
     * KnownCustomRelations above, and yet `switch (relation.type)` still narrows
     * every built-in member down to its own contract.
     */
    function readKeys(relation: RelationshipsContract) {
      switch (relation.type) {
        case 'belongsTo':
          return [relation.foreignKey, relation.localKey]
        case 'manyToMany':
          return [relation.pivotTable, relation.pivotForeignKey]
        case 'morphTo':
          return [relation.morphType]
        default:
          return []
      }
    }

    assert.isFunction(readKeys)
  })

  test('isMany narrows the union at the type level too', async ({ assert }) => {
    function setIt(relation: RelationshipsContract, parent: any, rows: any[]) {
      if (!relation.isMany) {
        // narrowed to hasOne | belongsTo | morphTo -> accepts a single row or null
        relation.setRelated(parent, rows[0] ?? null)
        return
      }
      // narrowed to hasMany | manyToMany | hasManyThrough -> accepts an array
      relation.setRelated(parent, rows)
    }

    assert.isFunction(setIt)
  })
})

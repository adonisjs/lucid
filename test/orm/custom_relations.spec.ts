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

import type { LucidModel, LucidRow } from '../../src/types/model.js'
import type { QueryClientContract } from '../../src/types/database.js'
import type {
  BaseRelationContract,
  RelationshipsContract,
  RelationQueryBuilderContract,
  RelationSubQueryBuilderContract,
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

/**
 * The key MUST match the contract's "type", otherwise the entry is discarded
 */
declare module '../../src/types/relations.js' {
  interface KnownCustomRelations {
    morphTo: MorphToRelationContract<LucidModel, LucidModel>
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

  client(_parent: LucidRow, _client: QueryClientContract): unknown {
    return null
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

  test('preload a custom SINGULAR relation on a single parent', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const BaseModel = getBaseModel(ormAdapter(db))

    BaseModel.$relationRegistry.register('morphTo', {
      create: (name, relatedModel, options, model) =>
        new MorphTo(name, relatedModel, options, model),
    })

    const morphTo = createRelationDecorator('morphTo')

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @morphTo(() => User)
      declare owner: any
    }
    User.boot()

    await db.table('users').multiInsert([{ username: 'virk' }, { username: 'romain' }])

    const user = await User.query().orderBy('id', 'asc').firstOrFail()
    await user.load('owner' as any)

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

    const morphTo = createRelationDecorator('morphTo')

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @morphTo(() => User)
      declare owner: any
    }
    User.boot()

    await db.table('users').multiInsert([{ username: 'virk' }, { username: 'romain' }])

    const users = await User.query()
      .orderBy('id', 'asc')
      .preload('owner' as any)

    assert.lengthOf(users, 2)
    users.forEach((one) => assert.isFalse(Array.isArray(one.owner)))
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

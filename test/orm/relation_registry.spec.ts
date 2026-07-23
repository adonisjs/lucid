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
import type { BaseRelationContract } from '../../src/types/relations.js'
import type { QueryClientContract } from '../../src/types/database.js'
import { RelationRegistry, createRelationDecorator, column } from '../../src/orm/main.js'
import { getDb, setup, cleanup, getBaseModel, ormAdapter } from '../../test-helpers/index.js'

/**
 * Augment KnownCustomRelations for test relations
 */
declare module '../../src/types/relations.js' {
  interface KnownCustomRelations {
    testRelation: BaseRelationContract<LucidModel, LucidModel>
    testManyRelation: BaseRelationContract<LucidModel, LucidModel>
  }
}

test.group('RelationRegistry', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(() => {
    /**
     * Clean up any test relations
     */
    RelationRegistry.unregister('customRelation')
  })

  test('register a custom relation type', ({ assert }) => {
    const factory = {
      create() {
        return {} as any
      },
    }

    RelationRegistry.register('customRelation', factory)

    assert.isTrue(RelationRegistry.has('customRelation'))
    const registeredFactory = RelationRegistry.get('customRelation')
    assert.equal(registeredFactory?.type, 'customRelation')
  })

  test('throw error when registering built-in relation types', ({ assert }) => {
    const builtInTypes = ['hasOne', 'hasMany', 'belongsTo', 'manyToMany', 'hasManyThrough']

    builtInTypes.forEach((type) => {
      assert.throws(
        () =>
          RelationRegistry.register(type, {
            create() {
              return {} as any
            },
          }),
        `Cannot register "${type}": it is a built-in relation type`
      )
    })
  })

  test('throw error when registering duplicate relation type', ({ assert }) => {
    const factory = {
      create() {
        return {} as any
      },
    }

    RelationRegistry.register('customRelation', factory)

    assert.throws(
      () => RelationRegistry.register('customRelation', factory),
      'Relation type "customRelation" is already registered'
    )
  })

  test('return undefined for unknown relation type', ({ assert }) => {
    assert.isUndefined(RelationRegistry.get('unknownRelation'))
  })

  test('unregister removes a relation type', ({ assert }) => {
    const factory = {
      create() {
        return {} as any
      },
    }

    RelationRegistry.register('customRelation', factory)
    assert.isTrue(RelationRegistry.has('customRelation'))

    RelationRegistry.unregister('customRelation')
    assert.isFalse(RelationRegistry.has('customRelation'))
  })
})

test.group('RelationRegistry | Integration with BaseModel', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(() => {
    RelationRegistry.unregister('testRelation')
  })

  test('use custom relation decorator created with createRelationDecorator', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class TestRelation implements BaseRelationContract<LucidModel, LucidModel> {
      type = 'testRelation' as const
      isMany = false
      booted = false
      relationName: string
      serializeAs: any
      model: LucidModel

      constructor(
        relationName: string,
        public relatedModel: () => LucidModel,
        private options: any,
        model: LucidModel
      ) {
        this.relationName = relationName
        this.model = model
      }

      boot() {
        this.booted = true
      }

      clone(): any {
        return new TestRelation(this.relationName, this.relatedModel, this.options, this.model)
      }

      setRelated() {}
      pushRelated() {}
      setRelatedForMany() {}

      client(_parent: LucidRow, _client: QueryClientContract): any {
        return null
      }

      eagerQuery(): any {
        return null
      }

      subQuery(): any {
        return null
      }
    }

    RelationRegistry.register('testRelation', {
      create(relationName, relatedModel, options, model) {
        return new TestRelation(relationName, relatedModel, options, model)
      },
    })

    const testRelation = createRelationDecorator('testRelation')

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @testRelation(() => User)
      declare related: any
    }

    /**
     * Verify the relation was added
     */
    assert.isTrue(User.$hasRelation('related'))
    assert.equal(User.$getRelation('related')!.type, 'testRelation')
    assert.instanceOf(User.$getRelation('related'), TestRelation)
  })

  test('throw error when using unregistered relation type', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    const unknownRelation = createRelationDecorator('unknownRelationType' as any)

    assert.throws(() => {
      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @unknownRelation(() => User)
        declare related: any
      }

      User.boot()
    }, '"unknownRelationType" is not a supported relation type. Did you forget to register it with RelationRegistry.register()?')
  })

  test('custom many relation accepts arrays in $setRelated', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    /**
     * A custom "many" relation implementation
     */
    class TestManyRelation implements BaseRelationContract<LucidModel, LucidModel> {
      type = 'testRelation' as const
      isMany = true
      booted = false
      relationName: string
      serializeAs: any
      model: LucidModel

      constructor(
        relationName: string,
        public relatedModel: () => LucidModel,
        private options: any,
        model: LucidModel
      ) {
        this.relationName = relationName
        this.model = model
      }

      boot() {
        this.booted = true
      }
      clone(): any {
        return new TestManyRelation(this.relationName, this.relatedModel, this.options, this.model)
      }
      setRelated() {}
      pushRelated() {}
      setRelatedForMany() {}
      client(): any {
        return null
      }
      eagerQuery(): any {
        return null
      }
      subQuery(): any {
        return null
      }
    }

    RelationRegistry.register('testRelation', {
      create(relationName, relatedModel, options, model) {
        return new TestManyRelation(relationName, relatedModel, options, model)
      },
    })

    const testRelation = createRelationDecorator('testRelation')

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @testRelation(() => User)
      declare related: any
    }

    User.boot()

    /**
     * Verify that $setRelated accepts arrays for relations with isMany = true
     */
    const user = new User()
    const related1 = new User()
    const related2 = new User()

    user.$setRelated('related', [related1, related2])
    assert.lengthOf(user.related, 2)
  })

  test('relation retains isMany multiplicity after unregister', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    /**
     * Define a custom "many" relation
     */
    class TestManyRelation implements BaseRelationContract<LucidModel, LucidModel> {
      type = 'testManyRelation' as any
      isMany = true
      booted = false
      relationName: string
      serializeAs: any
      model: LucidModel

      constructor(
        relationName: string,
        public relatedModel: () => LucidModel,
        private options: any,
        model: LucidModel
      ) {
        this.relationName = relationName
        this.model = model
      }

      boot() {
        this.booted = true
      }

      clone(): any {
        return new TestManyRelation(this.relationName, this.relatedModel, this.options, this.model)
      }

      setRelated() {}
      pushRelated() {}
      setRelatedForMany() {}

      client(_parent: LucidRow, _client: QueryClientContract): any {
        return null
      }

      eagerQuery(): any {
        return null
      }

      subQuery(): any {
        return null
      }
    }

    /**
     * Register the relation
     */
    RelationRegistry.register('testManyRelation', {
      create(relationName, relatedModel, options, model) {
        return new TestManyRelation(relationName, relatedModel, options, model)
      },
    })

    const testManyRelation = createRelationDecorator('testManyRelation')

    /**
     * Create a model with the relation
     */
    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @testManyRelation(() => User)
      declare friends: any
    }

    /**
     * Boot the model (this creates and stores the relation instance)
     */
    User.boot()

    /**
     * Verify the relation works with arrays before unregistering
     */
    const user1 = new User()
    const friend1 = new User()
    const friend2 = new User()

    user1.$setRelated('friends', [friend1, friend2])
    assert.lengthOf(user1.friends, 2)

    /**
     * Unregister the relation from the registry
     * This simulates a package being unloaded or registry state changing
     */
    RelationRegistry.unregister('testManyRelation')

    const user2 = new User()
    const friend3 = new User()
    const friend4 = new User()

    /***
     * This works because the relation class has isMany = true as a property.
     * The relation instance retains its multiplicity independent of the registry
     */
    user2.$setRelated('friends', [friend3, friend4])
    assert.lengthOf(user2.friends, 2)
  })
})

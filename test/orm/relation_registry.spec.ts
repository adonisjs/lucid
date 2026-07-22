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

// Augment KnownCustomRelations for test relations
declare module '../../src/types/relations.js' {
  interface KnownCustomRelations {
    testRelation: BaseRelationContract<LucidModel, LucidModel>
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
    // Clean up any test relations
    RelationRegistry.unregister('customRelation')
  })

  test('register a custom relation type', ({ assert }) => {
    const factory = {
      isMany: false,
      create() {
        return {} as any
      },
    }

    RelationRegistry.register('customRelation', factory)

    assert.isTrue(RelationRegistry.has('customRelation'))
    const registeredFactory = RelationRegistry.get('customRelation')
    assert.equal(registeredFactory?.type, 'customRelation')
    assert.equal(registeredFactory?.isMany, false)
  })

  test('throw error when registering duplicate relation type', ({ assert }) => {
    const factory = {
      isMany: false,
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

  test('getManyRelationTypes returns only many relations', ({ assert }) => {
    RelationRegistry.register('customMany', {
      isMany: true,
      create() {
        return {} as any
      },
    })

    RelationRegistry.register('customOne', {
      isMany: false,
      create() {
        return {} as any
      },
    })

    const manyTypes = RelationRegistry.getManyRelationTypes()

    // Should include custom custom many relation and not include custom one relation
    assert.include(manyTypes, 'customMany')
    assert.notInclude(manyTypes, 'customOne')

    RelationRegistry.unregister('customMany')
    RelationRegistry.unregister('customOne')
  })

  test('unregister removes a relation type', ({ assert }) => {
    const factory = {
      isMany: false,
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

    // Create a simple test relation
    class TestRelation implements BaseRelationContract<LucidModel, LucidModel> {
      type = 'testRelation' as const
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

    // Register the relation
    RelationRegistry.register('testRelation', {
      isMany: true,
      create(relationName, relatedModel, options, model) {
        return new TestRelation(relationName, relatedModel, options, model)
      },
    })

    // Create decorator
    const testRelation = createRelationDecorator('testRelation')

    // Use it on a model
    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @testRelation(() => User)
      declare related: any
    }

    // Verify the relation was added
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

      // Trigger boot
      User.boot()
    }, '"unknownRelationType" is not a supported relation type. Did you forget to register it with RelationRegistry.register()?')
  })

  test('custom relation included in MANY_RELATIONS when isMany is true', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class TestManyRelation implements BaseRelationContract<LucidModel, LucidModel> {
      type = 'testRelation' as const
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
      isMany: true,
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

    // Test that $setRelated accepts arrays for many relations
    const user = new User()
    const related1 = new User()
    const related2 = new User()

    user.$setRelated('related', [related1, related2])
    assert.lengthOf(user.related, 2)
  })
})

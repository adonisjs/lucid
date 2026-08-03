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

import { RelationRegistry, createRelationDecorator, column } from '../../src/orm/main.js'
import { getDb, setup, cleanup, getBaseModel, ormAdapter } from '../../test-helpers/index.js'

const BUILT_INS = ['hasOne', 'hasMany', 'belongsTo', 'manyToMany', 'hasManyThrough']

const noopFactory = {
  create() {
    return {} as any
  },
}

test.group('RelationRegistry', () => {
  test('a fresh registry knows the built-in relations', ({ assert }) => {
    const registry = new RelationRegistry()

    BUILT_INS.forEach((type) => assert.isTrue(registry.has(type)))
    assert.deepEqual(registry.types.sort(), [...BUILT_INS].sort())
  })

  test('register a custom relation type', ({ assert }) => {
    const registry = new RelationRegistry()
    registry.register('customRelation', noopFactory)

    assert.isTrue(registry.has('customRelation'))
    assert.equal(registry.get('customRelation')?.type, 'customRelation')
  })

  test('built-in and custom relations are retrieved the same way', ({ assert }) => {
    const registry = new RelationRegistry()
    registry.register('customRelation', noopFactory)

    assert.isFunction(registry.get('hasOne')!.create)
    assert.isFunction(registry.get('customRelation')!.create)
  })

  test('a relation type can never be replaced, built-in or custom', ({ assert }) => {
    const registry = new RelationRegistry()

    /**
     * The same rule and the same message for both. Built-ins are not privileged,
     * they are simply registered first.
     */
    BUILT_INS.forEach((type) => {
      assert.throws(
        () => registry.register(type, noopFactory),
        `Cannot register relation type "${type}": it is already registered. Relation types cannot be replaced, please pick a different name.`
      )
    })

    registry.register('customRelation', noopFactory)
    assert.throws(
      () => registry.register('customRelation', noopFactory),
      `Cannot register relation type "customRelation": it is already registered. Relation types cannot be replaced, please pick a different name.`
    )
  })

  test('return undefined for unknown relation type', ({ assert }) => {
    assert.isUndefined(new RelationRegistry().get('unknownRelation'))
  })

  test('registries are isolated from each other', ({ assert }) => {
    const one = new RelationRegistry()
    const two = new RelationRegistry()

    one.register('customRelation', noopFactory)

    assert.isTrue(one.has('customRelation'))
    assert.isFalse(two.has('customRelation'))
    assert.isTrue(two.has('hasOne'))
  })
})

test.group('RelationRegistry | Integration with BaseModel', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('built-in relations are resolved through the registry', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const BaseModel = getBaseModel(ormAdapter(getDb()))

    class Profile extends BaseModel {
      @column({ isPrimary: true })
      declare id: number
    }

    const hasOne = createRelationDecorator('hasOne')

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @hasOne(() => Profile)
      declare profile: any
    }

    assert.equal(User.$getRelation('profile' as any)!.type, 'hasOne')
  })

  test('throw error when using an unregistered relation type', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const BaseModel = getBaseModel(ormAdapter(getDb()))

    const unknownRelation = createRelationDecorator('unknownRelationType' as any)

    assert.throws(() => {
      class User extends BaseModel {
        @column({ isPrimary: true })
        declare id: number

        @unknownRelation(() => User)
        declare related: any
      }

      User.boot()
    }, '"unknownRelationType" is not a supported relation type. Did you forget to register it with BaseModel.$relationRegistry.register()?')
  })
})

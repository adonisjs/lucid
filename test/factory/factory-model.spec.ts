/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import { test } from '@japa/runner'

import type { HasOne } from '@ioc:Adonis/Lucid/Orm'
import { column, hasOne } from '../../src/Orm/Decorators'
import { FactoryManager } from '../../src/Factory/index'
import { FactoryModel } from '../../src/Factory/FactoryModel'
import { HasOne as FactoryHasOne } from '../../src/Factory/Relations/HasOne'

import {
  fs,
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
  setupApplication,
} from '../../test-helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

let db: ReturnType<typeof getDb>
let app: ApplicationContract
let BaseModel: ReturnType<typeof getBaseModel>
const factoryManager = new FactoryManager()

test.group('Factory | Factory Model', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.teardown(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define model factory', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const factory = new FactoryModel(User, () => new User(), factoryManager)
    assert.instanceOf(factory, FactoryModel)
  })

  test('define factory state', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    function stateFn() {}
    const factory = new FactoryModel(User, () => new User(), factoryManager).state(
      'active',
      stateFn
    )
    assert.deepEqual(factory.states, { active: stateFn })
  })

  test('define factory relation', async ({ assert }) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }
    User.boot()

    function relatedFn() {}
    const factory = new FactoryModel(User, () => new User(), factoryManager).relation(
      'profile',
      relatedFn
    )
    assert.property(factory.relations, 'profile')
    assert.instanceOf(factory.relations.profile, FactoryHasOne)
  })

  test('get pre-registered state', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    function stateFn() {}
    const factory = new FactoryModel(User, () => new User(), factoryManager).state(
      'active',
      stateFn
    )
    assert.deepEqual(factory.getState('active'), stateFn)
  })

  test('raise exception when state is not registered', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const factory = new FactoryModel(User, () => new User(), factoryManager)
    assert.throws(
      () => factory.getState('active'),
      'Cannot apply undefined state "active". Double check the model factory'
    )
  })

  test('get pre-registered relationship', async ({ assert }) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }
    User.boot()

    const profileFactory = new FactoryModel(Profile, () => new Profile(), factoryManager).build()
    function relatedFn() {
      return profileFactory
    }

    const factory = new FactoryModel(User, () => new User(), factoryManager).relation(
      'profile',
      relatedFn
    )
    assert.instanceOf(factory.getRelation('profile'), FactoryHasOne)
    assert.deepEqual(factory.getRelation('profile').relation, User.$getRelation('profile')!)
  })

  test('raise exception when relation is not defined', async ({ assert }) => {
    class Profile extends BaseModel {}
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const factory = new FactoryModel(User, () => new User(), factoryManager)
    assert.throws(
      () => factory.getRelation('profile'),
      'Cannot setup undefined relationship "profile". Double check the model factory'
    )
  })

  test('do not allow registering relationships not defined on the model', async ({ assert }) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const factory = () =>
      new FactoryModel(User, () => new User(), factoryManager).relation('profile' as any, () => {})
    assert.throws(
      factory,
      'Cannot define "profile" relationship. The relationship must exist on the "User" model first'
    )
  })

  test('build factory', async ({ assert }) => {
    class Profile extends BaseModel {}
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    ).build()

    const user = await factory.make()
    assert.instanceOf(user, User)
  })

  test('return model instance from the factory callback', async ({ assert }) => {
    class Profile extends BaseModel {}
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const factory = new FactoryModel(
      User,
      () => {
        return new User()
      },
      factoryManager
    ).build()

    const user = await factory.make()
    assert.instanceOf(user, User)
  })
})

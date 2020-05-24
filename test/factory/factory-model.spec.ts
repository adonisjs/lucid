/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'

import { HasOne } from '@ioc:Adonis/Lucid/Orm'
import { column, hasOne } from '../../src/Orm/Decorators'

import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
  getFactoryModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>
const FactoryModel = getFactoryModel()

test.group('Factory | Factory Model', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await db.manager.closeAll()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('define model factory', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const factory = new FactoryModel(User, () => new User())
    assert.instanceOf(factory, FactoryModel)
  })

  test('define factory state', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    function stateFn () {}
    const factory = new FactoryModel(User, () => new User()).state('active', stateFn)
    assert.deepEqual(factory.states, { active: stateFn })
  })

  test('define factory relation', async (assert) => {
    class Profile extends BaseModel {
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

    function relatedFn () {}
    const factory = new FactoryModel(User, () => new User()).related('profile', relatedFn)
    assert.deepEqual(factory.relations, { profile: relatedFn })
  })

  test('get pre-registered state', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    function stateFn () {}
    const factory = new FactoryModel(User, () => new User()).state('active', stateFn)
    assert.deepEqual(factory.getState('active'), stateFn)
  })

  test('raise exception when state is not registered', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const factory = new FactoryModel(User, () => new User())
    assert.throw(
      () => factory.getState('active'),
      'Cannot apply undefined state \"active\". Double check the model factory',
    )
  })

  test('get pre-registered relationship', async (assert) => {
    class Profile extends BaseModel {
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

    const profileFactory = new FactoryModel(Profile, () => new Profile()).build()
    function relatedFn () {
      return profileFactory
    }

    const factory = new FactoryModel(User, () => new User()).related('profile', relatedFn)
    assert.deepEqual(factory.getRelation('profile'), {
      factory: profileFactory,
      relation: User.$getRelation('profile')!,
    })
  })

  test('raise exception when relation is not defined', async (assert) => {
    class Profile extends BaseModel {
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

    const factory = new FactoryModel(User, () => new User())
    assert.throw(
      () => factory.getRelation('profile'),
      'Cannot setup undefined relationship \"profile\". Double check the model factory'
    )
  })

  test('do not allow registering relationships not defined on the model', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const factory = () => new FactoryModel(User, () => new User()).related('profile' as any, () => {})
    assert.throw(
      factory,
      'Cannot define "profile" relationship. The relationship must exist on the "User" model first'
    )
  })

  test('build factory', async (assert) => {
    class Profile extends BaseModel {
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

    const factory = new FactoryModel(User, () => new User()).build()
    const user = await factory.make()
    assert.instanceOf(user, User)
  })
})

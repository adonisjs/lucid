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
import { HasOne } from '@ioc:Adonis/Lucid/Relations'
import { FactoryManager } from '../../src/Factory/index'
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
const factoryManager = new FactoryManager()

test.group('Factory | HasOne | make', (group) => {
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

  test('make model with relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const profileFactory = new FactoryModel(Profile, () => {
      return {
        displayName: 'virk',
      }
    }, factoryManager).build()

    const factory = new FactoryModel(User, () => {
      return {}
    }, factoryManager)
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory.with('profile').makeStubbed()

    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)

    assert.exists(user.profile.id)
    assert.isFalse(user.profile.$isPersisted)
    assert.equal(user.profile.userId, user.id)
  })

  test('pass custom attributes to relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const profileFactory = new FactoryModel(Profile, () => {
      return {
        displayName: 'virk',
      }
    }, factoryManager).build()

    const factory = new FactoryModel(User, () => {
      return {}
    }, factoryManager)
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory
      .with('profile', 1, (related) => related.merge({ displayName: 'Romain' }))
      .makeStubbed()

    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)
    assert.isFalse(user.profile.$isPersisted)
    assert.equal(user.profile.displayName, 'Romain')
    assert.equal(user.profile.userId, user.id)
    assert.exists(user.profile.id)
  })
})

test.group('Factory | HasOne | create', (group) => {
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

  test('create model with relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const profileFactory = new FactoryModel(Profile, () => {
      return {
        displayName: 'virk',
      }
    }, factoryManager).build()

    const factory = new FactoryModel(User, () => {
      return {}
    }, factoryManager)
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory.with('profile').create()

    assert.isTrue(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)
    assert.isTrue(user.profile.$isPersisted)
    assert.equal(user.profile.userId, user.id)
  })

  test('pass custom attributes to relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const profileFactory = new FactoryModel(Profile, () => {
      return {
        displayName: 'virk',
      }
    }, factoryManager).build()

    const factory = new FactoryModel(User, () => {
      return {}
    }, factoryManager)
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory
      .with('profile', 1, (related) => related.merge({ displayName: 'Romain' }))
      .create()

    assert.isTrue(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)
    assert.isTrue(user.profile.$isPersisted)
    assert.equal(user.profile.displayName, 'Romain')
    assert.equal(user.profile.userId, user.id)
  })

  test('create model with custom foreign key', async (assert) => {
    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      public authorId: number

      @column()
      public displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasOne(() => Profile, { foreignKey: 'authorId' })
      public profile: HasOne<typeof Profile>
    }

    const profileFactory = new FactoryModel(Profile, () => {
      return {
        displayName: 'virk',
      }
    }, factoryManager).build()

    const factory = new FactoryModel(User, () => {
      return {}
    }, factoryManager)
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory.with('profile').create()

    assert.isTrue(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)
    assert.isTrue(user.profile.$isPersisted)
    assert.equal(user.profile.authorId, user.id)
  })

  test('rollback changes on error', async (assert) => {
    assert.plan(3)

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const profileFactory = new FactoryModel(Profile, () => {
      return {}
    }, factoryManager).build()

    const factory = new FactoryModel(User, () => {
      return {}
    }, factoryManager)
      .relation('profile', () => profileFactory)
      .build()

    try {
      await factory.with('profile').create()
    } catch (error) {
      assert.exists(error)
    }

    const users = await db.from('users').exec()
    const profiles = await db.from('profiles').exec()

    assert.lengthOf(users, 0)
    assert.lengthOf(profiles, 0)
  })
})

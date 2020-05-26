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
import { BelongsTo } from '@ioc:Adonis/Lucid/Relations'
import { column, belongsTo } from '../../src/Orm/Decorators'

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

test.group('Factory | BelongTo | make', (group) => {
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
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const profileFactory = new FactoryModel(Profile, () => {
      const profile = new Profile()
      profile.displayName = 'virk'
      return profile
    })
      .related('user', () => factory)
      .build()

    const factory = new FactoryModel(User, () => new User()).build()

    const profile = await profileFactory.with('user').make()
    assert.isFalse(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isFalse(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
  })

  test('pass custom attributes to the relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const profileFactory = new FactoryModel(Profile, () => {
      const profile = new Profile()
      profile.displayName = 'virk'
      return profile
    })
      .related('user', () => factory)
      .build()

    const factory = new FactoryModel(User, (_, attributes?: any) => {
      const user = new User()
      user.points = attributes?.points || 0
      return user
    }).build()

    const profile = await profileFactory.with('user', 1, (related) => related.fill({ points: 10 })).make()
    assert.isFalse(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isFalse(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
    assert.equal(profile.user.points, 10)
  })
})

test.group('Factory | BelongTo | create', (group) => {
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

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const profileFactory = new FactoryModel(Profile, () => {
      const profile = new Profile()
      profile.displayName = 'virk'
      return profile
    })
      .related('user', () => factory)
      .build()

    const factory = new FactoryModel(User, () => new User()).build()

    const profile = await profileFactory.with('user').create()
    assert.isTrue(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isTrue(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
  })

  test('pass custom attributes to the relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const profileFactory = new FactoryModel(Profile, () => {
      const profile = new Profile()
      profile.displayName = 'virk'
      return profile
    })
      .related('user', () => factory)
      .build()

    const factory = new FactoryModel(User, (_, attributes?: any) => {
      const user = new User()
      user.points = attributes?.points || 0
      return user
    }).build()

    const profile = await profileFactory.with('user', 1, (related) => related.fill({ points: 10 })).create()
    assert.isTrue(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isTrue(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
    assert.equal(profile.user.points, 10)
  })

  test('create model with custom foreign key', async (assert) => {
    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      public authorId: number

      @column()
      public displayName: string

      @belongsTo(() => User, { foreignKey: 'authorId' })
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const profileFactory = new FactoryModel(Profile, () => {
      const profile = new Profile()
      profile.displayName = 'virk'
      return profile
    })
      .related('user', () => factory)
      .build()

    const factory = new FactoryModel(User, (_, attributes?: any) => {
      const user = new User()
      user.points = attributes?.points || 0
      return user
    }).build()

    const profile = await profileFactory.with('user', 1, (related) => related.fill({ points: 10 })).create()
    assert.isTrue(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isTrue(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.authorId)
    assert.equal(profile.user.points, 10)
  })

  test('rollback changes on error', async (assert) => {
    assert.plan(3)

    class Profile extends BaseModel {
      @column()
      public userId: number

      @column()
      public displayName: string

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public points: number = 0
    }

    const profileFactory = new FactoryModel(Profile, () => {
      const profile = new Profile()
      profile.displayName = 'Virk'
      return profile
    })
      .related('user', () => factory)
      .build()

    /**
     * Creating user in advance, so that the `user` relationship
     * create call raises a unique constraint exception.
     *
     * After the exception, we except the profile insert to be
     * rolled back as well.
     */
    await db.table('users').insert({ username: 'virk' })

    const factory = new FactoryModel(User, () => {
      const user = new User()
      user.username = 'virk'
      return user
    }).build()

    try {
      await profileFactory.with('user').create()
    } catch (error) {
      assert.exists(error)
    }

    const profiles = await db.from('profiles').exec()
    const users = await db.from('users').exec()

    assert.lengthOf(profiles, 0)
    assert.lengthOf(users, 1) // one user still exists from the setup insert call
  })
})

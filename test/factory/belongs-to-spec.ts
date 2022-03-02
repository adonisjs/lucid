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
import { BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { FactoryManager } from '../../src/Factory/index'
import { column, belongsTo } from '../../src/Orm/Decorators'

import {
  fs,
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
  setupApplication,
  getFactoryModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let app: ApplicationContract
let BaseModel: ReturnType<typeof getBaseModel>
const FactoryModel = getFactoryModel()
const factoryManager = new FactoryManager()

test.group('Factory | BelongTo | make', (group) => {
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

  test('make model with relationship', async ({ assert }) => {
    class Profile extends BaseModel {
      @column()
      public id: number

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

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    ).build()

    const profile = await profileFactory.with('user').makeStubbed()
    assert.exists(profile.id)
    assert.isFalse(profile.$isPersisted)

    assert.exists(profile.user.id)
    assert.instanceOf(profile.user, User)
    assert.isFalse(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
  })

  test('pass custom attributes to the relationship', async ({ assert }) => {
    class Profile extends BaseModel {
      @column()
      public id: number

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

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    const factory = new FactoryModel(
      User,
      () => {
        return {
          points: 0,
        }
      },
      factoryManager
    ).build()

    const profile = await profileFactory
      .with('user', 1, (related) => related.merge({ points: 10 }))
      .makeStubbed()

    assert.exists(profile.id)
    assert.isFalse(profile.$isPersisted)
    assert.instanceOf(profile.user, User)

    assert.exists(profile.user.id)
    assert.isFalse(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
    assert.equal(profile.user.points, 10)
  })

  test('invoke make hook on the related factory', async ({ assert }) => {
    class Profile extends BaseModel {
      @column()
      public id: number

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
    User.boot()

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    const factory = new FactoryModel(
      User,
      () => {
        return {
          points: 0,
        }
      },
      factoryManager
    )
      .after('make', (_, user) => {
        user.id = 100
      })
      .build()

    const profile = await profileFactory
      .with('user', 1, (related) => related.merge({ points: 10 }))
      .makeStubbed()

    assert.exists(profile.id)
    assert.isFalse(profile.$isPersisted)
    assert.instanceOf(profile.user, User)

    assert.exists(profile.user.id)
    assert.equal(profile.user.points, 10)
    assert.isFalse(profile.user.$isPersisted)
    assert.equal(profile.userId, 100)
    assert.equal(profile.user.id, 100)
  })
})

test.group('Factory | BelongTo | create', (group) => {
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

  test('create model with relationship', async ({ assert }) => {
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

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    const factory = new FactoryModel(
      User,
      () => {
        return {}
      },
      factoryManager
    ).build()

    const profile = await profileFactory.with('user').create()

    assert.isTrue(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isTrue(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)

    const users = await db.from('users').select('*')
    const profiles = await db.from('profiles').select('*')

    assert.lengthOf(profiles, 1)
    assert.lengthOf(users, 1)
    assert.equal(profiles[0].user_id, users[0].id)
  })

  test('pass custom attributes to the relationship', async ({ assert }) => {
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

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    const factory = new FactoryModel(
      User,
      () => {
        return {
          points: 0,
        }
      },
      factoryManager
    ).build()

    const profile = await profileFactory
      .with('user', 1, (related) => related.merge({ points: 10 }))
      .create()

    assert.isTrue(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isTrue(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.userId)
    assert.equal(profile.user.points, 10)
  })

  test('create model with custom foreign key', async ({ assert }) => {
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

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    const factory = new FactoryModel(
      User,
      () => {
        return {
          points: 0,
        }
      },
      factoryManager
    ).build()

    const profile = await profileFactory
      .with('user', 1, (related) => related.merge({ points: 10 }))
      .create()

    assert.isTrue(profile.$isPersisted)
    assert.instanceOf(profile.user, User)
    assert.isTrue(profile.user.$isPersisted)
    assert.equal(profile.user.id, profile.authorId)
    assert.equal(profile.user.points, 10)
  })

  test('rollback changes on error', async ({ assert }) => {
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

    const profileFactory = new FactoryModel(
      Profile,
      () => {
        return {
          displayName: 'virk',
        }
      },
      factoryManager
    )
      .relation('user', () => factory)
      .build()

    /**
     * Creating user in advance, so that the `user` relationship
     * create call raises a unique constraint exception.
     *
     * After the exception, we except the profile insert to be
     * rolled back as well.
     */
    await db.table('users').insert({ username: 'virk' })

    const factory = new FactoryModel(
      User,
      () => {
        return {
          username: 'virk',
        }
      },
      factoryManager
    ).build()

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

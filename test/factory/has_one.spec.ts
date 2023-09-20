/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import type { HasOne } from '../../src/types/relations.js'

import { FactoryManager } from '../../src/factories/main.js'
import { column, hasOne } from '../../src/orm/decorators/index.js'

import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  resetTables,
  getBaseModel,
} from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

const factoryManager = new FactoryManager()

test.group('Factory | HasOne | make', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('make model with relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const profileFactory = factoryManager
      .define(Profile, () => {
        return {
          displayName: 'virk',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
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

  test('pass custom attributes to relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare id: number

      @column()
      declare userId: number

      @column()
      declare displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const profileFactory = factoryManager
      .define(Profile, () => {
        return {
          displayName: 'virk',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
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
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('create model with relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const profileFactory = factoryManager
      .define(Profile, () => {
        return {
          displayName: 'virk',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory.with('profile').create()

    assert.isTrue(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)
    assert.isTrue(user.profile.$isPersisted)
    assert.equal(user.profile.userId, user.id)

    const users = await db.from('users').select('*')
    const profiles = await db.from('profiles').select('*')

    assert.lengthOf(profiles, 1)
    assert.lengthOf(users, 1)
    assert.equal(profiles[0].user_id, users[0].id)
  })

  test('pass custom attributes to relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const profileFactory = factoryManager
      .define(Profile, () => {
        return {
          displayName: 'virk',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
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

  test('create model with custom foreign key', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class Profile extends BaseModel {
      @column({ columnName: 'user_id' })
      declare authorId: number

      @column()
      declare displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @hasOne(() => Profile, { foreignKey: 'authorId' })
      declare profile: HasOne<typeof Profile>
    }

    const profileFactory = factoryManager
      .define(Profile, () => {
        return {
          displayName: 'virk',
        }
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .relation('profile', () => profileFactory)
      .build()

    const user = await factory.with('profile').create()

    assert.isTrue(user.$isPersisted)
    assert.instanceOf(user.profile, Profile)
    assert.isTrue(user.profile.$isPersisted)
    assert.equal(user.profile.authorId, user.id)
  })

  test('rollback changes on error', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    assert.plan(3)

    class Profile extends BaseModel {
      @column()
      declare userId: number

      @column()
      declare displayName: string
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      points: number = 0

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const profileFactory = factoryManager
      .define(Profile, () => {
        return {}
      })
      .build()

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
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

/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { FactoryManager } from '../../src/factory/index.js'
import type { HasOne } from '../../adonis-typings/relations.js'
import { column, hasOne } from '../../src/orm/decorators/index.js'
import { FactoryModel } from '../../src/factory/factory_model.js'
import { HasOne as FactoryHasOne } from '../../src/factory/relations/has_one.js'

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

test.group('Factory | Factory Model', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('define model factory', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const factory = factoryManager.define(User, () => new User())
    assert.instanceOf(factory, FactoryModel)
  })

  test('define factory state', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    function stateFn() {}
    const factory = factoryManager.define(User, () => new User()).state('active', stateFn)
    assert.deepEqual(factory.states, { active: stateFn })
  })

  test('define factory relation', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }
    User.boot()

    function relatedFn() {}
    const factory = factoryManager.define(User, () => new User()).relation('profile', relatedFn)
    assert.property(factory.relations, 'profile')
    assert.instanceOf(factory.relations.profile, FactoryHasOne)
  })

  test('get pre-registered state', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    function stateFn() {}
    const factory = factoryManager.define(User, () => new User()).state('active', stateFn)
    assert.deepEqual(factory.getState('active'), stateFn)
  })

  test('raise exception when state is not registered', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const factory = factoryManager.define(User, () => new User())
    assert.throws(
      () => factory.getState('active' as never),
      'Cannot apply undefined state "active". Double check the model factory'
    )
  })

  test('get pre-registered relationship', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {
      @column()
      declare userId: number
    }
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }
    User.boot()

    const profileFactory = factoryManager.define(Profile, () => new Profile()).build()
    function relatedFn() {
      return profileFactory
    }

    const factory = factoryManager.define(User, () => new User()).relation('profile', relatedFn)
    assert.instanceOf(factory.getRelation('profile'), FactoryHasOne)
    assert.deepEqual(factory.getRelation('profile').relation, User.$getRelation('profile')!)
  })

  test('raise exception when relation is not defined', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {}
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const factory = factoryManager.define(User, () => new User())
    assert.throws(
      () => factory.getRelation('profile' as never),
      'Cannot reference "profile" relationship. Make sure to setup the relationship within the factory'
    )
  })

  test('do not allow registering relationships not defined on the model', async ({
    fs,
    assert,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    const factory = () =>
      factoryManager.define(User, () => new User()).relation('profile' as any, () => {})
    assert.throws(
      factory,
      'Cannot define "profile" relationship. The relationship must exist on the "User" model first'
    )
  })

  test('build factory', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {}
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .build()

    const user = await factory.make()
    assert.instanceOf(user, User)
  })

  test('return model instance from the factory callback', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class Profile extends BaseModel {}
    Profile.boot()

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @hasOne(() => Profile)
      declare profile: HasOne<typeof Profile>
    }

    const factory = factoryManager
      .define(User, () => {
        return new User()
      })
      .build()

    const user = await factory.make()
    assert.instanceOf(user, User)
  })
})

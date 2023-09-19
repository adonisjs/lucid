/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { randomUUID } from 'node:crypto'

import { column } from '../../src/orm/decorators/index.js'
import { FactoryManager } from '../../src/factories/main.js'
import { FactoryContext } from '../../src/factories/factory_context.js'
import { FactoryBuilder } from '../../src/factories/factory_builder.js'

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

test.group('Factory | Factory Builder | make', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').makeStubbed()
    assert.equal(user.points, 10)
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ fs, assert }) => {
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

      @column()
      points: number = 0
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => {
        user.points += 10
      })
      .build()

    const user = await factory.apply('withPoints').apply('withPoints').makeStubbed()

    assert.equal(user.points, 10)
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('pass instance of builder to the state callback', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user, __, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        user.merge({ points: 10 })
      })
      .build()

    const user = await factory.apply('withPoints').makeStubbed()
    assert.equal(user.points, 10)
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('merge custom attributes', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const user = await factory.merge({ username: 'nikk' }).makeStubbed()
    assert.equal(user.username, 'nikk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('define custom merge function', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .merge(() => {})
      .build()

    const user = await factory.merge({ username: 'nikk' }).makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('pass builder to custom merge function', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .merge((_, __, ___, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
      })
      .build()

    const user = await factory.merge({ username: 'nikk' }).makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('define custom newUp function', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .newUp((attributes) => {
        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('pass model to custom newUp function', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .newUp((attributes) => {
        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('pass factory builder to custom newUp function', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .newUp((attributes, _, __, builder) => {
        assert.instanceOf(builder, FactoryBuilder)

        const user = new User()
        user.fill(attributes)
        user.$extras = { invoked: true }
        return user
      })
      .merge(() => {})
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.deepEqual(user.$extras, { invoked: true })
    assert.isFalse(user.$isPersisted)
  })

  test('use 0 index elements when attributes are defined as an array', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const user = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).makeStubbed()
    assert.equal(user.username, 'nikk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('invoke after make hook', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(6)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .after('make', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
      })
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('invoke after makeStubbed hook', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(6)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .after('makeStubbed', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
      })
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.exists(user.id)
    assert.isFalse(user.$isPersisted)
  })

  test('define custom id inside make hook', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .after('make', (_, user, ctx) => {
        if (ctx.isStubbed) {
          user.id = 100
        }
      })
      .build()

    const user = await factory.makeStubbed()
    assert.equal(user.username, 'virk')
    assert.equal(user.id, 100)
    assert.isFalse(user.$isPersisted)
  })

  test('tap into model persistence before makeStubbed', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const user = await factory
      .tap(($user, ctx) => {
        if (ctx.isStubbed) {
          $user.id = 100
        }
      })
      .makeStubbed()

    assert.equal(user.username, 'virk')
    assert.equal(user.id, 100)
    assert.isFalse(user.$isPersisted)
  })

  test('tap into model persistence before make', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const user = await factory
      .tap(($user) => {
        $user.username = 'tapped'
      })
      .make()

    assert.equal(user.username, 'tapped')
    assert.isFalse(user.$isPersisted)
  })

  test('bubble erros when makeStubbed fails', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .state('foo', () => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(async () => await factory.apply('foo').makeStubbed(), 'boom')
  })

  test('bubble erros when make fails', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .state('foo', () => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(async () => await factory.apply('foo').make(), 'boom')
  })
})

test.group('Factory | Factory Builder | makeMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ fs, assert }) => {
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

      @column()
      points: number = 0
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points += 10))
      .build()

    const users = await factory.apply('withPoints').apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)

    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const users = await factory.merge({ username: 'nikk' }).makeStubbedMany(2)
    assert.lengthOf(users, 2)

    assert.exists(users[0].id)
    assert.equal(users[0].username, 'nikk')
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].username, 'nikk')
    assert.isFalse(users[1].$isPersisted)
  })

  test('define index specific attributes for makeMany', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const users = await factory
      .merge([{ username: 'nikk' }, { username: 'romain' }])
      .makeStubbedMany(2)
    assert.lengthOf(users, 2)

    assert.exists(users[0].id)
    assert.equal(users[0].username, 'nikk')
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].username, 'romain')
    assert.isFalse(users[1].$isPersisted)
  })

  test('run makeStubbed hook for all the model instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(15)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .after('makeStubbed', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('run make hook for all the model instances', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(15)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .after('make', (_, user, ctx) => {
        assert.instanceOf(_, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').makeStubbedMany(2)
    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('tap into model persistence before makeStubbedMany', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(15)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory
      .apply('withPoints')
      .tap((user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .makeStubbedMany(2)

    assert.lengthOf(users, 2)
    assert.exists(users[0].id)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.exists(users[1].id)
    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('tap into model persistence before makeMany', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(13)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory
      .apply('withPoints')
      .tap((user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf(user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal(user.points, 10)
      })
      .makeMany(2)

    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isFalse(users[0].$isPersisted)

    assert.equal(users[1].points, 10)
    assert.isFalse(users[1].$isPersisted)
  })

  test('bubble errors when makeStubbedMany fails', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .merge(() => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(
      async () => await factory.merge({ username: 'virk' }).makeStubbedMany(2),
      'boom'
    )
  })

  test('bubble errors when makeMany fails', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .merge(() => {
        throw new Error('boom')
      })
      .build()

    await assert.rejects(async () => await factory.merge({ username: 'virk' }).makeMany(2), 'boom')
  })
})

test.group('Factory | Factory Builder | create', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ fs, assert }) => {
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

      @column()
      points: number = 0
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points += 10))
      .build()

    const user = await factory.apply('withPoints').apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const user = await factory.merge({ username: 'nikk' }).create()
    assert.equal(user.username, 'nikk')
    assert.isTrue(user.$isPersisted)
  })

  test('use index 0 elements when attributes are defined as an array', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const user = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).create()
    assert.equal(user.username, 'nikk')
    assert.isTrue(user.$isPersisted)
  })

  test('invoke before and after create hook', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(4)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .before('create', (_, user) => {
        assert.isFalse(user.$isPersisted)
      })
      .after('create', (_, user) => {
        assert.isTrue(user.$isPersisted)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('invoke after make hook', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(6)
    const stack: string[] = []

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .before('create', (_, user) => {
        stack.push('beforeCreate')
        assert.isFalse(user.$isPersisted)
      })
      .after('make', (_, user) => {
        stack.push('afterMake')
        assert.isFalse(user.$isPersisted)
      })
      .after('create', (_, user) => {
        stack.push('afterCreate')
        assert.isTrue(user.$isPersisted)
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory.apply('withPoints').create()
    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
    assert.deepEqual(stack, ['afterMake', 'beforeCreate', 'afterCreate'])
  })

  test('define custom connection', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const user = await factory
      .connection('secondary')
      .apply('withPoints')
      .tap((_, { $trx }) => {
        assert.equal($trx?.connectionName, 'secondary')
      })
      .create()

    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('define custom query client', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const client = db.connection('secondary')

    const user = await factory
      .client(client)
      .apply('withPoints')
      .tap((_, { $trx }) => {
        assert.equal($trx?.connectionName, 'secondary')
      })
      .create()

    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('invoke tap callback before persisting the model', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(6)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const client = db.connection('secondary')

    const user = await factory
      .client(client)
      .apply('withPoints')
      .tap(($user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf($user, User)
        assert.instanceOf(ctx, FactoryContext)
        assert.equal($user.points, 10)
      })
      .create()

    assert.equal(user.points, 10)
    assert.isTrue(user.$isPersisted)
  })

  test('bubble errors when create fails', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', () => {
        throw new Error('boo')
      })
      .build()

    const client = db.connection('secondary')
    await assert.rejects(async () => await factory.client(client).apply('withPoints').create())
  })
})

test.group('Factory | Factory Builder | createMany', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('apply factory model state', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points = 10))
      .build()

    const users = await factory.apply('withPoints').createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('applying a state twice must be a noop', async ({ fs, assert }) => {
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

      @column()
      points: number = 0
    }

    const factory = factoryManager
      .define(User, () => {
        return {}
      })
      .state('withPoints', (user) => (user.points += 10))
      .build()

    const users = await factory.apply('withPoints').apply('withPoints').createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('define custom attributes accepted by the newUp method', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: randomUUID(),
          points: 0,
        }
      })
      .build()

    const users = await factory.merge({ points: 10 }).createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].points, 10)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].points, 10)
    assert.isTrue(users[1].$isPersisted)
  })

  test('define index specific attributes for makeMany', async ({ fs, assert }) => {
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

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const users = await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).createMany(2)
    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].username, 'romain')
    assert.isTrue(users[1].$isPersisted)
  })

  test('invoke tap before persisting all models', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    assert.plan(11)

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .build()

    const users = await factory
      .merge([{ username: 'nikk' }, { username: 'romain' }])
      .tap(($user, ctx, builder) => {
        assert.instanceOf(builder, FactoryBuilder)
        assert.instanceOf($user, User)
        assert.instanceOf(ctx, FactoryContext)
      })
      .createMany(2)

    assert.lengthOf(users, 2)
    assert.equal(users[0].username, 'nikk')
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[1].username, 'romain')
    assert.isTrue(users[1].$isPersisted)
  })

  test('bubble errors when createMany fails', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    let index = 0

    class User extends BaseModel {
      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare points: number
    }

    const factory = factoryManager
      .define(User, () => {
        return {
          username: 'virk',
        }
      })
      .merge(() => {
        index++
        if (index === 2) {
          throw new Error('boom')
        }
      })
      .build()

    await assert.rejects(
      async () => await factory.merge([{ username: 'nikk' }, { username: 'romain' }]).createMany(2),
      'boom'
    )

    const users = await User.all()
    assert.lengthOf(users, 0)
  })
})

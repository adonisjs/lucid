/*
 * @poppinss/data-models
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { DateTime } from 'luxon'
import { lodash } from '@poppinss/utils'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import type { HasOne, HasMany, BelongsTo } from '@ioc:Adonis/Lucid/Orm'

import { ModelQueryBuilder } from '../../src/Orm/QueryBuilder'

import {
  column,
  hasMany,
  hasOne,
  belongsTo,
  beforeSave,
  beforeCreate,
  afterCreate,
  afterSave,
  afterUpdate,
  beforeUpdate,
  beforeDelete,
  afterDelete,
  beforeFetch,
  afterFetch,
  beforeFind,
  afterFind,
  afterPaginate,
  beforePaginate,
  computed,
} from '../../src/Orm/Decorators'

import {
  fs,
  getDb,
  cleanup,
  setup,
  mapToObj,
  getUsers,
  ormAdapter,
  resetTables,
  FakeAdapter,
  getBaseModel,
  setupApplication,
} from '../../test-helpers'
import { ModelPaginator } from '../../src/Orm/Paginator'
import { SimplePaginator } from '../../src/Database/Paginator/SimplePaginator'
import { SnakeCaseNamingStrategy } from '../../src/Orm/NamingStrategies/SnakeCase'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>
let app: ApplicationContract

test.group('Base model | boot', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('ensure save method is chainable', async (assert) => {
    const adapter = new FakeAdapter()
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }
    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.age = 22
    const chained = await user.save()

    assert.instanceOf(chained, User)
  })

  test('ensure fill method is chainable', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    const chained = user.fill({
      username: 'virk',
      age: 22,
    })

    assert.instanceOf(chained, User)
  })

  test('ensure merge method is chainable', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    const chained = user.merge({
      username: 'virk',
      age: 22,
    })

    assert.instanceOf(chained, User)
  })

  test('ensure refresh method is chainable', async (assert) => {
    const adapter = new FakeAdapter()
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }
    User.$adapter = adapter

    const user = new User()
    const chained = await user.refresh()

    assert.instanceOf(chained, User)
  })

  test('compute table name from model name', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    assert.equal(User.table, 'users')
  })

  test('allow overriding table name', async (assert) => {
    class User extends BaseModel {
      public static table = 'my_users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    assert.equal(User.table, 'my_users')
  })

  test('initiate all required static properties', async (assert) => {
    class User extends BaseModel {}

    User.boot()
    assert.deepEqual(mapToObj(User.$columnsDefinitions), {})
    assert.deepEqual(mapToObj(User.$relationsDefinitions), {})
    assert.deepEqual(mapToObj(User.$computedDefinitions), {})
  })

  test('resolve column name from attribute name', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public userName: string
    }

    User.boot()
    assert.deepEqual(User.$keys.attributesToColumns.get('userName'), 'user_name')
  })

  test('resolve serializeAs name from the attribute name', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public userName: string
    }

    User.boot()
    assert.deepEqual(User.$keys.attributesToSerialized.get('userName'), 'user_name')
  })

  test('resolve attribute name from column name', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public userName: string
    }

    User.boot()
    assert.deepEqual(User.$keys.columnsToAttributes.get('user_name'), 'userName')
  })

  test('resolve serializeAs name from column name', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public userName: string
    }

    User.boot()
    assert.deepEqual(User.$keys.columnsToSerialized.get('user_name'), 'user_name')
  })

  test('resolve attribute name from serializeAs name', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public userName: string
    }

    User.boot()
    assert.deepEqual(User.$keys.serializedToAttributes.get('user_name'), 'userName')
  })

  test('resolve column name from serializeAs name', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public userName: string
    }

    User.boot()
    assert.deepEqual(User.$keys.serializedToColumns.get('user_name'), 'user_name')
  })
})

test.group('Base Model | options', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('set connection using useConnection method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    user.useConnection('foo')
    assert.deepEqual(user.$options, { connection: 'foo' })
  })

  test('set connection do not overwrite profiler from the options', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    const profiler = app.profiler
    user.$options = { profiler: profiler }

    user.useConnection('foo')
    assert.deepEqual(user.$options, { connection: 'foo', profiler: profiler })
  })
})

test.group('Base Model | getter-setters', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('set property on $attributes when defined on model instance', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('pass value to setter when defined', (assert) => {
    class User extends BaseModel {
      @column()
      public set username(value: any) {
        this.$setAttribute('username', value.toUpperCase())
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.$attributes, { username: 'VIRK' })
  })

  test('set value on model instance when is not a column', (assert) => {
    class User extends BaseModel {
      public username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.$attributes, {})
    assert.equal(user.username, 'virk')
  })

  test('get value from attributes', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk' }

    assert.equal(user.username, 'virk')
  })

  test('rely on getter when column is defined as a getter', (assert) => {
    class User extends BaseModel {
      @column()
      public get username() {
        return this.$getAttribute('username').toUpperCase()
      }
    }

    const user = new User()
    user.$attributes = { username: 'virk' }

    assert.equal(user.username, 'VIRK')
  })

  test('get value from model instance when is not a column', (assert) => {
    class User extends BaseModel {
      public username = 'virk'
    }

    User.boot()
    const user = new User()
    assert.equal(user.username, 'virk')
  })

  test('get value for primary key', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk', id: 1 }

    assert.deepEqual(user.$primaryKeyValue, 1)
  })

  test('invoke getter when accessing value using primaryKeyValue', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public get id() {
        return String(this.$getAttribute('id'))
      }

      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk', id: 1 }

    assert.deepEqual(user.$primaryKeyValue, '1')
  })

  test('invoke column serialize method when serializing model', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public get id() {
        return String(this.$getAttribute('id'))
      }

      @column({
        serialize(value) {
          return value.toUpperCase()
        },
      })
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk', id: 1 }
    assert.equal(user.username, 'virk')
    assert.equal(user.toJSON().username, 'VIRK')
  })

  test('implement custom merge strategies using getters and setters', (assert) => {
    class User extends BaseModel {
      @column()
      public get preferences(): object {
        return this.$getAttribute('preferences')
      }

      public set preferences(value: object) {
        this.$setAttribute('preferences', lodash.merge(this.preferences, value))
      }
    }

    const user = new User()

    /**
     * Define and check property
     */
    user.preferences = {
      theme: 'dark',
    }
    assert.deepEqual(user.preferences, { theme: 'dark' })

    /**
     * Hydrate originals as if persisted
     */
    user.$hydrateOriginals()
    user.$isPersisted = true

    /**
     * Ensure $original is same as $attributes and nothing
     * is dirty
     */
    assert.deepEqual(user.$original, { preferences: { theme: 'dark' } })
    assert.deepEqual(user.$original, user.$attributes)
    assert.deepEqual(user.$dirty, {})

    user.merge({ preferences: { notifications: true } })
    assert.deepEqual(user.preferences, { theme: 'dark', notifications: true })

    assert.deepEqual(user.$dirty, { preferences: { theme: 'dark', notifications: true } })
  })
})

test.group('Base Model | dirty', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('get dirty properties on a fresh model', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.$dirty, { username: 'virk' })
    assert.isTrue(user.$isDirty)
  })

  test('get empty object when model is not dirty', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk' }
    user.$original = { username: 'virk' }

    user.$isPersisted = true

    assert.deepEqual(user.$dirty, {})
    assert.isFalse(user.$isDirty)
  })

  test('get empty object when model is not dirty with null values', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()

    user.$attributes = { username: null }
    user.$original = { username: null }
    user.$isPersisted = true

    assert.deepEqual(user.$dirty, {})
    assert.isFalse(user.$isDirty)
  })

  test('get empty object when model is not dirty with false values', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()

    user.$attributes = { username: false }
    user.$original = { username: false }
    user.$isPersisted = true

    assert.deepEqual(user.$dirty, {})
    assert.isFalse(user.$isDirty)
  })

  test('get values removed as a side-effect of fill as dirty', async (assert) => {
    const adapter = new FakeAdapter()
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }
    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.age = 22
    await user.save()

    assert.deepEqual(user.$dirty, {})
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)

    user.fill({ username: 'virk' })
    assert.deepEqual(user.$dirty, { age: null })
  })
})

test.group('Base Model | persist', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('persist model with the column name', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    User.$adapter = adapter
    adapter.on('insert', (model) => {
      model.$consumeAdapterResult({ id: 1 })
    })

    const user = new User()
    user.username = 'virk'
    user.fullName = 'H virk'

    await user.save()

    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk', full_name: 'H virk' },
      },
    ])

    assert.deepEqual(user.$attributes, { username: 'virk', fullName: 'H virk', id: 1 })
    assert.deepEqual(user.$original, { username: 'virk', fullName: 'H virk', id: 1 })
  })

  test('merge adapter insert return value with attributes', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: number
    }

    User.$adapter = adapter
    adapter.on('insert', (model) => {
      model.$consumeAdapterResult({ id: 1 })
    })

    const user = new User()
    user.username = 'virk'

    await user.save()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk' },
      },
    ])

    assert.deepEqual(user.$attributes, { username: 'virk', id: 1 })
    assert.deepEqual(user.$original, { username: 'virk', id: 1 })
  })

  test('do not merge adapter results when not part of model columns', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter
    adapter.on('insert', () => {
      return { id: 1 }
    })

    const user = new User()
    user.username = 'virk'

    await user.save()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk' },
      },
    ])

    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.$original, { username: 'virk' })
  })

  test('issue update when model has already been persisted', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.$isPersisted = true

    await user.save()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [
      {
        type: 'update',
        instance: user,
        attributes: { username: 'virk' },
      },
    ])

    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.$original, { username: 'virk' })
  })

  test('merge return values from update', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    adapter.on('update', (model) => {
      return model.$consumeAdapterResult({ updated_at: '2019-11-20' })
    })

    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.$isPersisted = true

    await user.save()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [
      {
        type: 'update',
        instance: user,
        attributes: { username: 'virk' },
      },
    ])

    assert.deepEqual(user.$attributes, { username: 'virk', updatedAt: '2019-11-20' })
    assert.deepEqual(user.$original, { username: 'virk', updatedAt: '2019-11-20' })
  })

  test('do not issue update when model is not dirty', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    User.$adapter = adapter

    const user = new User()
    user.$isPersisted = true

    await user.save()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [])
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })

  test('refresh model instance', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.isUndefined(user.updatedAt)

    await user.refresh()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.isDefined(user.updatedAt)
  })

  test('refresh model instance inside a transaction', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    /**
     * Create user
     */
    const user = new User()
    user.username = 'virk'
    await user.save()

    /**
     * Update inside transaction
     */
    const trx = await db.transaction()
    user.useTransaction(trx)
    user.username = 'romain'
    await user.save()
    assert.equal(user.username, 'romain')

    /**
     * Refresh inside transaction
     */
    await user.refresh()
    assert.equal(user.username, 'romain')

    /**
     * Refresh outside transaction
     */
    await trx.rollback()
    await user.refresh()
    assert.equal(user.username, 'virk')
  })

  test('raise exception when attempted to refresh deleted row', async (assert) => {
    assert.plan(4)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.isUndefined(user.updatedAt)

    await db.from('users').del()

    try {
      await user.refresh()
    } catch ({ message }) {
      assert.equal(message, '"Model.refresh" failed. Unable to lookup "users" table where "id" = 1')
    }
  })

  test('invoke column prepare method before passing values to the adapter', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name', prepare: (value) => value.toUpperCase() })
      public fullName: string
    }

    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.fullName = 'H virk'

    await user.save()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk', full_name: 'H VIRK' },
      },
    ])

    assert.deepEqual(user.$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(user.$original, { username: 'virk', fullName: 'H virk' })
  })

  test('send values mutated by the hooks to the adapter', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string

      @beforeUpdate()
      public static touchValues(model: User) {
        model.fullName = 'Foo'
      }
    }

    User.$adapter = adapter
    adapter.on('update', (_, attributes) => {
      assert.deepEqual(attributes, { full_name: 'Foo' })
    })

    const user = new User()
    user.$isPersisted = true
    await user.save()

    assert.deepEqual(user.$attributes, { fullName: 'Foo' })
    assert.deepEqual(user.$original, { fullName: 'Foo' })
  })

  test('allow datetime column value to be null', async (assert) => {
    assert.plan(3)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public createdAt: DateTime | null
    }

    User.$adapter = adapter
    adapter.on('update', (_, attributes) => {
      assert.deepEqual(attributes, { created_at: null })
    })

    const user = new User()
    await user.save()

    user.createdAt = null
    await user.save()

    assert.deepEqual(user.$attributes, { createdAt: null })
    assert.deepEqual(user.$original, { createdAt: null })
  })

  test('assign local id to the model', async (assert) => {
    class User extends BaseModel {
      public static table = 'uuid_users'
      public static selfAssignPrimaryKey = true

      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    User.boot()

    const uuid = '2da96a33-57a0-4752-9d56-0e2485d4d2a4'

    const user = new User()
    user.id = uuid
    user.username = 'virk'
    await user.save()

    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.isUndefined(user.updatedAt)
    assert.equal(user.id, uuid)

    await user.refresh()
    assert.isTrue(user.$isPersisted)
    assert.isFalse(user.$isDirty)
    assert.isDefined(user.updatedAt)
    assert.equal(user.id.toLocaleLowerCase(), uuid)
  })

  test('perform update query when local primary key is updated', async (assert) => {
    class User extends BaseModel {
      public static table = 'uuid_users'
      public static selfAssignPrimaryKey = true

      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ columnName: 'updated_at' })
      public updatedAt: string
    }

    User.boot()

    const uuid = '2da96a33-57a0-4752-9d56-0e2485d4d2a4'

    const user = new User()
    user.id = uuid
    user.username = 'virk'
    await user.save()

    const newUuid = '4da96a33-57a0-4752-9d56-0e2485d4d2a1'
    user.id = newUuid

    await user.save()
    const users = await User.all()
    assert.lengthOf(users, 1)
    assert.equal(users[0].id.toLowerCase(), newUuid)
  })
})

test.group('Self assign primary key', () => {
  test('send primary value during insert to the adapter', async (assert) => {
    assert.plan(1)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      public static selfAssignPrimaryKey = true

      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    User.$adapter = adapter
    adapter.on('insert', (_, attributes) => {
      assert.deepEqual(attributes, {
        id: '12345',
        username: 'virk',
        full_name: 'H virk',
      })
    })

    const user = new User()
    user.id = '12345'
    user.username = 'virk'
    user.fullName = 'H virk'

    await user.save()
  })

  test('update primary key when changed', async (assert) => {
    assert.plan(3)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      public static selfAssignPrimaryKey = true

      @column({ isPrimary: true })
      public id: string

      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    User.$adapter = adapter
    adapter.on('insert', (_, attributes) => {
      assert.deepEqual(attributes, {
        id: '12345',
        username: 'virk',
        full_name: 'H virk',
      })
    })
    adapter.on('update', (_, dirty) => {
      assert.deepEqual(dirty, {
        id: '3456',
      })
    })

    const user = new User()
    user.id = '12345'
    user.username = 'virk'
    user.fullName = 'H virk'

    await user.save()
    user.id = '3456'

    await user.save()
    assert.isFalse(user.$isDirty)
  })
})

test.group('Base Model | create from adapter results', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('create model instance using $createFromAdapterResult method', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult({ username: 'virk' })
    user!.username = 'virk'

    assert.isTrue(user!.$isPersisted)
    assert.isFalse(user!.$isDirty)
    assert.isFalse(user!.$isLocal)
    assert.deepEqual(user!.$attributes, { username: 'virk' })
    assert.deepEqual(user!.$original, { username: 'virk' })
  })

  test('set options on model instance passed to $createFromAdapterResult', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult({ username: 'virk' }, [], { connection: 'foo' })

    assert.deepEqual(user!.$options, { connection: 'foo' })
    assert.isTrue(user!.$isPersisted)
    assert.isFalse(user!.$isDirty)
    assert.isFalse(user!.$isLocal)
    assert.deepEqual(user!.$attributes, { username: 'virk' })
    assert.deepEqual(user!.$original, { username: 'virk' })
  })

  test('return null from $createFromAdapterResult when input is not object', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult([])
    assert.isNull(user)
  })

  test('create multiple model instance using $createMultipleFromAdapterResult', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const users = User.$createMultipleFromAdapterResult([
      { username: 'virk', full_name: 'H virk' },
      { username: 'prasan' },
    ])
    assert.lengthOf(users, 2)

    assert.isTrue(users[0].$isPersisted)
    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[0].$isLocal)
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })

    assert.isTrue(users[1].$isPersisted)
    assert.isFalse(users[1].$isDirty)
    assert.isFalse(users[1].$isLocal)
    assert.deepEqual(users[1].$attributes, { username: 'prasan' })
    assert.deepEqual(users[1].$original, { username: 'prasan' })
  })

  test('pass model options via $createMultipleFromAdapterResult', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const users = User.$createMultipleFromAdapterResult(
      [{ username: 'virk', full_name: 'H virk' }, { username: 'prasan' }],
      [],
      { connection: 'foo' }
    )

    assert.lengthOf(users, 2)

    assert.isTrue(users[0].$isPersisted)
    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[0].$isLocal)
    assert.deepEqual(users[0].$options, { connection: 'foo' })
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })

    assert.isTrue(users[1].$isPersisted)
    assert.isFalse(users[1].$isDirty)
    assert.isFalse(users[1].$isLocal)
    assert.deepEqual(users[1].$options, { connection: 'foo' })
    assert.deepEqual(users[1].$attributes, { username: 'prasan' })
    assert.deepEqual(users[1].$original, { username: 'prasan' })
  })

  test('skip rows that are not valid objects inside array', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const users = User.$createMultipleFromAdapterResult([
      { username: 'virk', full_name: 'H virk' },
      null as any,
    ])
    assert.lengthOf(users, 1)

    assert.isTrue(users[0].$isPersisted)
    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[0].$isLocal)
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })
  })

  test('invoke column consume method', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({
        consume: (value) => value.toUpperCase(),
      })
      public fullName: string
    }

    const user = User.$createFromAdapterResult({ full_name: 'virk' })

    assert.isTrue(user!.$isPersisted)
    assert.isFalse(user!.$isDirty)
    assert.isFalse(user!.$isLocal)
    assert.deepEqual(user!.$attributes, { fullName: 'VIRK' })
    assert.deepEqual(user!.$original, { fullName: 'VIRK' })
  })

  test('original and attributes should not be shared', async (assert) => {
    class User extends BaseModel {
      @column()
      public user: {
        username: string
      }

      @column({ columnName: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult({
      user: {
        username: 'virk',
      },
    })

    user!.user.username = 'nikk'
    assert.isTrue(user!.$isDirty)
    assert.deepEqual(user!.$dirty, { user: { username: 'nikk' } })
  })
})

test.group('Base Model | delete', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('delete model instance using adapter', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter

    const user = new User()
    await user.delete()
    assert.deepEqual(adapter.operations, [
      {
        type: 'delete',
        instance: user,
      },
    ])

    assert.isTrue(user.$isDeleted)
  })

  test('raise exception when trying to mutate model after deletion', async (assert) => {
    const adapter = new FakeAdapter()
    assert.plan(1)

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter

    const user = new User()
    await user.delete()

    try {
      user.username = 'virk'
    } catch ({ message }) {
      assert.equal(message, 'E_MODEL_DELETED: Cannot mutate delete model instance')
    }
  })
})

test.group('Base Model | serializeAttributes', () => {
  test('serialize attributes', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(), { username: 'virk' })
  })

  test('invoke custom serialize method when serializing attributes', async (assert) => {
    class User extends BaseModel {
      @column({ serialize: (value) => value.toUpperCase() })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(), { username: 'VIRK' })
  })

  test('use custom serializeAs key', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: 'uname' })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(), { uname: 'virk' })
  })

  test('do not serialize when serializeAs key is null', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: null })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(), {})
  })

  test('pick fields during serialization', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes(['id']), { id: '1' })
  })

  test('ignore fields under omit', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(
      user.serializeAttributes({
        omit: ['username'],
      }),
      { id: '1' }
    )
  })

  test('use omit and pick together', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(
      user.serializeAttributes({
        pick: ['id', 'username'],
        omit: ['username'],
      }),
      { id: '1' }
    )
  })

  test('ignore fields that has serializeAs = null, even when part of pick array', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ serializeAs: null })
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes(['id']), {})
  })

  test('do not invoke custom serialize method when raw flag is on', async (assert) => {
    class User extends BaseModel {
      @column({ serialize: (value) => value.toUpperCase() })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(undefined, true), { username: 'virk' })
  })

  test('use custom serializeAs key when raw flag is on', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: 'uname' })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(undefined, true), { uname: 'virk' })
  })

  test('do not serialize with serializeAs = null, when raw flag is on', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: null })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serializeAttributes(undefined, true), {})
  })

  test('cherry pick fields in raw mode', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes(['id'], true), { id: '1' })
  })

  test('ignore fields under omit array in raw mode', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(
      user.serializeAttributes(
        {
          pick: ['id', 'username'],
          omit: ['username'],
        },
        true
      ),
      { id: '1' }
    )
  })
})

test.group('Base Model | serializeRelations', () => {
  test('serialize relations', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations(), {
      profile: {
        username: 'virk',
        user_id: 1,
      },
    })
  })

  test('use custom serializeAs key when raw flag is on', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile, { serializeAs: 'userProfile' })
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations(), {
      userProfile: {
        username: 'virk',
        user_id: 1,
      },
    })
  })

  test('do not serialize relations when serializeAs is null', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile, { serializeAs: null })
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations(), {})
  })

  test('do not recursively serialize relations when raw is true', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations(undefined, true), {
      profile: profile,
    })
  })

  test('use custom serializeAs key when raw flag is on', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile, { serializeAs: 'userProfile' })
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations(undefined, true), {
      userProfile: profile,
    })
  })

  test('do not serialize relations with serializeAs is null when raw flag is on', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile, { serializeAs: null })
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations(undefined, true), {})
  })

  test('cherry pick relationship fields', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(
      user.serializeRelations({
        profile: {
          fields: ['user_id'],
        },
      }),
      {
        profile: {
          user_id: 1,
        },
      }
    )
  })

  test('select all fields when no custom fields are defined for a relationship', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(
      user.serializeRelations({
        profile: {},
      }),
      {
        profile: {
          user_id: 1,
          username: 'virk',
        },
      }
    )
  })

  test('do not select any fields when relationship fields is an empty array', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(
      user.serializeRelations({
        profile: {
          fields: [],
        },
      }),
      {
        profile: {},
      }
    )
  })
})

test.group('Base Model | toJSON', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('convert model to its JSON representation', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toJSON(), { username: 'virk' })
  })

  test('use serializeAs key when converting model to JSON', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: 'theUsername' })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toJSON(), { theUsername: 'virk' })
  })

  test('do not serialize when serializeAs is set to null', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: null })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toJSON(), {})
  })

  test('add computed properties to toJSON result', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @computed()
      public get fullName() {
        return this.username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toJSON(), { username: 'virk', fullName: 'VIRK' })
  })

  test('do not add computed property when it returns undefined', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @computed()
      public get fullName() {
        return undefined
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toJSON(), { username: 'virk' })
  })

  test('cherry pick keys during serialization', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @computed()
      public get fullName() {
        return this.username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(
      user.serialize({
        fields: ['username'],
      }),
      { username: 'virk' }
    )
  })

  test('serialize extras', async (assert) => {
    class User extends BaseModel {
      public serializeExtras = true

      @column()
      public username: string

      @computed()
      public get fullName() {
        return this.username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'
    user.$extras = { postsCount: 10 }

    assert.deepEqual(user.toJSON(), {
      username: 'virk',
      fullName: 'VIRK',
      meta: {
        postsCount: 10,
      },
    })
  })

  test('define serialize extras as a function', async (assert) => {
    class User extends BaseModel {
      public serializeExtras() {
        return {
          posts: {
            count: this.$extras.postsCount,
          },
        }
      }

      @column()
      public username: string

      @computed()
      public get fullName() {
        return this.username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'
    user.$extras = { postsCount: 10 }

    assert.deepEqual(user.toJSON(), {
      username: 'virk',
      fullName: 'VIRK',
      posts: {
        count: 10,
      },
    })
  })

  test('do not serialize undefined values', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toJSON(), { username: 'virk' })
  })

  test('serialize null values', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number | null
    }

    const user = new User()
    user.username = 'virk'
    user.age = null

    assert.deepEqual(user.toJSON(), { username: 'virk', age: null })
  })
})

test.group('BaseModel | cache', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('cache getter value', (assert) => {
    let invokedCounter = 0

    class User extends BaseModel {
      @column()
      public get username() {
        return this.$getAttributeFromCache('username', (value) => {
          invokedCounter++
          return value.toUpperCase()
        })
      }
    }

    const user = new User()
    user.$attributes = { username: 'virk' }

    assert.equal(user.username, 'VIRK')
    assert.equal(user.username, 'VIRK')
    assert.equal(user.username, 'VIRK')
    assert.equal(user.username, 'VIRK')
    assert.equal(user.username, 'VIRK')
    assert.equal(invokedCounter, 1)
  })

  test('re-call getter function when attribute value changes', (assert) => {
    let invokedCounter = 0

    class User extends BaseModel {
      @column()
      public get username() {
        return this.$getAttributeFromCache('username', (value) => {
          invokedCounter++
          return value.toUpperCase()
        })
      }
    }

    const user = new User()
    user.$attributes = { username: 'virk' }

    assert.equal(user.username, 'VIRK')

    user.$attributes.username = 'Prasanjit'
    assert.equal(user.username, 'PRASANJIT')
    assert.equal(user.username, 'PRASANJIT')
    assert.equal(user.username, 'PRASANJIT')
    assert.equal(user.username, 'PRASANJIT')

    assert.equal(invokedCounter, 2)
  })
})

test.group('BaseModel | fill/merge', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('fill model instance with bulk attributes', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.fill({ username: 'virk' })
    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('raise error when extra properties are defined', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    const fn = () => user.fill({ username: 'virk', isAdmin: true } as any)
    assert.throw(
      fn,
      'Cannot define "isAdmin" on "User" model, since it is not defined as a model property'
    )
  })

  test('set extra properties via fill when allowExtraProperties is true', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.fill({ username: 'virk', isAdmin: true } as any, true)
    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.$extras, { isAdmin: true })
  })

  test('overwrite existing values when using fill', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 22 })
    user.fill({ username: 'virk' })
    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('merge to existing when using merge instead of fill', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 22 })
    user.merge({ username: 'virk' })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 22 })
  })

  test('set properties with explicit undefined values', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 22 })
    user.merge({ username: 'virk', age: undefined })
    assert.deepEqual(user.$attributes, { username: 'virk', age: undefined })
  })

  test('invoke setter when using fill', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public get age(): number {
        return this.$getAttribute('age')
      }

      public set age(age: number) {
        this.$setAttribute('age', age + 1)
      }
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 23 })
    user.fill({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 23 })
  })

  test('fill using the column name', (assert) => {
    class User extends BaseModel {
      @column()
      public firstName: string
    }

    const user = new User()
    user.fill({ first_name: 'virk' } as any)
    assert.deepEqual(user.$attributes, { firstName: 'virk' })
  })

  test('invoke setter during fill when using column name', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ columnName: 'user_age' })
      public get age(): number {
        return this.$getAttribute('age')
      }

      public set age(age: number) {
        this.$setAttribute('age', age + 1)
      }
    }

    const user = new User()
    user.fill({ user_age: 22 } as any)
    assert.deepEqual(user.$attributes, { age: 23 })
  })

  test('merge set non-column model properties', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public age: number

      public foo: string
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 22 })
    user.merge({ username: 'virk', foo: 'bar' })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 22 })
    assert.equal(user.foo, 'bar')
  })

  test('merge set non-column model properties with inheritance', (assert) => {
    class Super extends BaseModel {
      public foo: string
    }

    class User extends Super {
      @column()
      public username: string

      @column()
      public age: number
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 22 })
    user.merge({ username: 'virk', foo: 'bar' })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 22 })
    assert.equal(user.foo, 'bar')
  })
})

test.group('Base | apdater', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('pass model instance with attributes to the adapter insert method', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter
    const user = new User()
    user.username = 'virk'

    await user.save()

    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk' },
      },
    ])
  })

  test('pass model instance with attributes to the adapter update method', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter
    const user = new User()
    user.username = 'virk'

    await user.save()

    user.username = 'nikk'
    await user.save()

    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk' },
      },
      {
        type: 'update',
        instance: user,
        attributes: { username: 'nikk' },
      },
    ])
  })

  test('pass model instance to the adapter delete method', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string
    }

    User.$adapter = adapter
    const user = new User()
    user.username = 'virk'

    await user.save()
    await user.delete()

    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { username: 'virk' },
      },
      {
        type: 'delete',
        instance: user,
      },
    ])
  })

  test('fill model instance with bulk attributes via column name is different', async (assert) => {
    const adapter = new FakeAdapter()
    class User extends BaseModel {
      @column({ columnName: 'first_name' })
      public firstName: string
    }

    User.$adapter = adapter

    const user = new User()
    user.fill({ firstName: 'virk' })
    await user.save()

    assert.deepEqual(adapter.operations, [
      {
        type: 'insert',
        instance: user,
        attributes: { first_name: 'virk' },
      },
    ])
  })
})

test.group('Base Model | sideloaded', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('define sideloaded properties using $consumeAdapterResults method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.$consumeAdapterResult({ username: 'virk' }, { loggedInUser: { id: 1 } })

    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.$sideloaded, { loggedInUser: { id: 1 } })
  })

  test('define sideloaded properties using $createFromAdapterResult method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = User.$createFromAdapterResult({ username: 'virk' }, { loggedInUser: { id: 1 } })!
    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.$sideloaded, { loggedInUser: { id: 1 } })
  })

  test('define sideloaded properties using $createMultipleFromAdapterResult method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const users = User.$createMultipleFromAdapterResult(
      [{ username: 'virk' }, { username: 'nikk' }],
      { loggedInUser: { id: 1 } }
    )

    assert.deepEqual(users[0].$attributes, { username: 'virk' })
    assert.deepEqual(users[0].$sideloaded, { loggedInUser: { id: 1 } })

    assert.deepEqual(users[1].$attributes, { username: 'nikk' })
    assert.deepEqual(users[1].$sideloaded, { loggedInUser: { id: 1 } })
  })

  // @todo: PASS SIDELOADED PROPERTIES TO RELATIONSHIPS AS WELL
})

test.group('Base Model | relations', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('set hasOne relation', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profile', await Profile.create({ username: 'virk' }))

    assert.deepEqual(user.profile.username, 'virk')
    assert.instanceOf(user.$preloaded.profile, Profile)
  })

  test('return undefined when relation is not preloaded', (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.$consumeAdapterResult({
      id: 1,
    })

    assert.isUndefined(user.profile)
    assert.deepEqual(user.$preloaded, {})
  })

  test('serialize relation toJSON', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profile', await Profile.create({ username: 'virk' }))

    assert.deepEqual(user.toJSON(), {
      id: 1,
      profile: {
        username: 'virk',
      },
    })
  })

  test('cherry pick relationship keys during serialize', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })

    const profile = await Profile.create({ username: 'virk' })
    user.$setRelated('profile', profile)
    profile.userId = 1

    assert.deepEqual(
      user.serialize({
        fields: ['id'],
        relations: {
          profile: {
            fields: ['username'],
          },
        },
      }),
      {
        id: 1,
        profile: {
          username: 'virk',
        },
      }
    )
  })

  test('cherry pick nested relationship keys during serialize', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number

      @belongsTo(() => User)
      public user: BelongsTo<typeof User>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public email: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    Profile.$adapter = adapter

    const user = new User()
    user.$consumeAdapterResult({ id: 1, email: 'virk@adonisjs.com' })

    const profileUser = new User()
    profileUser.$consumeAdapterResult({ id: 1, email: 'virk@adonisjs.com' })

    const profile = await Profile.create({ username: 'virk' })
    user.$setRelated('profile', profile)
    profile.$setRelated('user', profileUser)
    profile.userId = 1

    assert.deepEqual(
      user.serialize({
        fields: ['id'],
        relations: {
          profile: {
            fields: ['username'],
            relations: {
              user: {
                fields: ['email'],
              },
            },
          },
        },
      }),
      {
        id: 1,
        profile: {
          username: 'virk',
          user: {
            email: 'virk@adonisjs.com',
          },
        },
      }
    )
  })

  test('serialize relation toJSON with custom serializeAs key', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile, { serializeAs: 'social' })
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profile', await Profile.create({ username: 'virk' }))

    assert.deepEqual(user.toJSON(), {
      id: 1,
      social: {
        username: 'virk',
      },
    })
  })

  test('push relationship', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Profile)
      public profiles: HasMany<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })
    user.$pushRelated('profiles', await Profile.create({ username: 'nikk' }))

    assert.deepEqual(user.toJSON(), {
      id: 1,
      profiles: [
        {
          username: 'nikk',
        },
      ],
    })
  })

  test('push relationship to existing list', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Profile)
      public profiles: HasMany<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profiles', [await Profile.create({ username: 'virk' })])
    user.$pushRelated('profiles', await Profile.create({ username: 'nikk' }))

    assert.deepEqual(user.toJSON(), {
      id: 1,
      profiles: [
        {
          username: 'virk',
        },
        {
          username: 'nikk',
        },
      ],
    })
  })

  test('push an array of relationships', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Profile)
      public profiles: HasMany<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })
    user.$pushRelated('profiles', [
      await Profile.create({ username: 'virk' }),
      await Profile.create({ username: 'nikk' }),
    ])

    assert.deepEqual(user.toJSON(), {
      id: 1,
      profiles: [
        {
          username: 'virk',
        },
        {
          username: 'nikk',
        },
      ],
    })
  })

  test('raise error when pushing an array of relationships for hasOne', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })

    const profile = await Profile.create({ username: 'virk' })
    const profile1 = await Profile.create({ username: 'virk' })

    const fn = () => user.$pushRelated('profile', [profile, profile1] as any)
    assert.throw(fn, '"User.profile" cannot reference more than one instance of "Profile" model')
  })

  test('raise error when setting single relationships for hasMany', async (assert) => {
    const adapter = new FakeAdapter()
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @hasMany(() => Profile)
      public profiles: HasMany<typeof Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })

    const profile = await Profile.create({ username: 'virk' })

    const fn = () => user.$setRelated('profiles', profile as any)
    assert.throw(fn, '"User.profiles" must be an array when setting "hasMany" relationship')
  })
})

test.group('Base Model | fetch', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('find using the primary key', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.find(1)

    assert.instanceOf(user, User)
    assert.equal(user!.$primaryKeyValue, 1)
  })

  test('raise exception when row is not found', async (assert) => {
    assert.plan(1)
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    try {
      await User.findOrFail(1)
    } catch ({ message }) {
      assert.equal(message, 'E_ROW_NOT_FOUND: Row not found')
    }
  })

  test('find many using the primary key', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db
      .insertQuery()
      .table('users')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.findMany([1, 2])
    assert.lengthOf(users, 2)
    assert.equal(users[0].$primaryKeyValue, 2)
    assert.equal(users[1].$primaryKeyValue, 1)
  })

  test('return the existing row when search criteria matches', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrCreate({ userName: 'virk' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.isTrue(user.$isPersisted)
    assert.instanceOf(user, User)
    assert.equal(user!.$primaryKeyValue, 1)
  })

  test("create new row when search criteria doesn't match", async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrCreate({ userName: 'nikk' }, { email: 'nikk@gmail.com' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 2)
    assert.instanceOf(user, User)

    assert.equal(user!.$primaryKeyValue, 2)
    assert.isTrue(user.$isPersisted)
    assert.equal(user!.email, 'nikk@gmail.com')
    assert.equal(user!.userName, 'nikk')
  })

  test('return the existing row when search criteria matches using firstOrNew', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrNew({ userName: 'virk' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.instanceOf(user, User)
    assert.isTrue(user.$isPersisted)
    assert.equal(user!.$primaryKeyValue, 1)
  })

  test("instantiate new row when search criteria doesn't match using firstOrNew", async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrNew({ userName: 'nikk' }, { email: 'nikk@gmail.com' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.instanceOf(user, User)

    assert.isUndefined(user!.$primaryKeyValue)
    assert.isFalse(user.$isPersisted)
    assert.equal(user!.email, 'nikk@gmail.com')
    assert.equal(user!.userName, 'nikk')
  })

  test('update the existing row when search criteria matches', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.updateOrCreate({ userName: 'virk' }, { points: 20 })
    assert.isTrue(user.$isPersisted)
    assert.equal(user.points, 20)
    assert.equal(user.userName, 'virk')

    const users = await db.query().from('users')

    assert.lengthOf(users, 1)
    assert.equal(users[0].points, 20)
  })

  test('lock row for update to handle concurrent requests', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string

      @column()
      public points: number

      public static boot() {
        if (this.booted) {
          return
        }

        super.boot()
        this.before('update', (model) => {
          model.points += 1
        })
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk', points: 20 })

    /**
     * The update or create method will first fetch the row and then performs
     * an update using the model instance. The model hook will use the original
     * database value to increment the points by 1.
     *
     * However, both reads will be performed concurrently, each instance will
     * receive the original `20` points and update will reflect `21` and not
     * expected `22`.
     *
     * To fix the above issue, we must lock the row for update, since we can
     * guarantee that an update will always be performed.
     */
    await Promise.all([
      User.updateOrCreate({ userName: 'virk' }, { email: 'virk-1@adonisjs.com' }),
      User.updateOrCreate({ userName: 'virk' }, { email: 'virk-2@adonisjs.com' }),
    ])

    const users = await db.query().from('users')

    assert.lengthOf(users, 1)
    assert.equal(users[0].points, 22)
  })

  test('execute updateOrCreate update action inside a transaction', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const trx = await db.transaction()

    const user = await User.updateOrCreate({ userName: 'virk' }, { points: 20 }, { client: trx })

    assert.isTrue(user.$isPersisted)
    assert.equal(user.points, 20)
    assert.equal(user.userName, 'virk')

    await trx.rollback()

    const users = await db.query().from('users')
    assert.lengthOf(users, 1)

    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].points, 0)
  })

  test('create a new row when search criteria fails', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.updateOrCreate({ username: 'nikk' }, { points: 20 })

    assert.isTrue(user.$isPersisted)
    assert.equal(user.points, 20)
    assert.equal(user.username, 'nikk')

    const users = await db.query().from('users')
    assert.lengthOf(users, 2)

    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].points, 0)

    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].points, 20)
  })

  test('execute updateOrCreate create action inside a transaction', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const trx = await db.transaction()

    const user = await User.updateOrCreate({ username: 'nikk' }, { points: 20 }, { client: trx })

    assert.isTrue(user.$isPersisted)
    assert.equal(user.points, 20)
    assert.equal(user.username, 'nikk')

    await trx.rollback()

    const users = await db.query().from('users')
    assert.lengthOf(users, 1)

    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].points, 0)
  })

  test('persist records to db when find call returns zero rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    const users = await User.fetchOrCreateMany('username', [
      {
        username: 'virk',
        email: 'virk@adonisjs.com',
      },
      {
        username: 'nikk',
        email: 'nikk@adonisjs.com',
      },
      {
        username: 'romain',
        email: 'romain@adonisjs.com',
      },
    ])

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')

    assert.isTrue(users[1].$isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')

    assert.isTrue(users[2].$isPersisted)
    assert.equal(users[2].username, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
  })

  test('sync records by avoiding duplicates', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const users = await User.fetchOrCreateMany('username', [
      {
        username: 'virk',
        email: 'virk@adonisjs.com',
      },
      {
        username: 'nikk',
        email: 'nikk@adonisjs.com',
      },
      {
        username: 'romain',
        email: 'romain@adonisjs.com',
      },
    ])

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')
    assert.equal(users[0].points, 10)

    assert.isTrue(users[1].$isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')
    assert.isUndefined(users[1].points)

    assert.isTrue(users[2].$isPersisted)
    assert.equal(users[2].username, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')
    assert.isUndefined(users[2].points)

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
  })

  test('wrap create calls inside a transaction', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const trx = await db.transaction()

    await User.fetchOrCreateMany(
      'username',
      [
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
      ],
      {
        client: trx,
      }
    )

    await trx.rollback()
    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
  })

  test('handle columns with different cast key name', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public userName: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const users = await User.fetchOrCreateMany('userName', [
      {
        userName: 'virk',
        email: 'virk@adonisjs.com',
      },
      {
        userName: 'nikk',
        email: 'nikk@adonisjs.com',
      },
      {
        userName: 'romain',
        email: 'romain@adonisjs.com',
      },
    ])

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[0].userName, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')
    assert.equal(users[0].points, 10)

    assert.isTrue(users[1].$isPersisted)
    assert.equal(users[1].userName, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')
    assert.isUndefined(users[1].points)

    assert.isTrue(users[2].$isPersisted)
    assert.equal(users[2].userName, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')
    assert.isUndefined(users[2].points)

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
  })

  test('raise exception when one or more rows fails', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const trx = await db.transaction()

    try {
      await User.fetchOrCreateMany(
        'username',
        [
          {
            username: 'nikk',
            email: 'virk@adonisjs.com',
          },
          {
            username: 'romain',
            email: 'romain@adonisjs.com',
          },
        ],
        {
          client: trx,
        }
      )
    } catch (error) {
      assert.exists(error)
      await trx.rollback()
    }

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
  })

  test('raise exception when value of unique key inside payload is undefined', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    try {
      await User.fetchOrCreateMany('username', [
        {
          email: 'virk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
      ])
    } catch ({ message }) {
      assert.equal(
        message,
        'Value for the "username" is null or undefined inside "fetchOrCreateMany" payload'
      )
    }

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
  })

  test('raise exception when key is not defined on the model', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    try {
      await User.fetchOrCreateMany('username' as any, [
        {
          email: 'virk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        } as any,
      ])
    } catch ({ message }) {
      assert.equal(
        message,
        'Value for the "username" is null or undefined inside "fetchOrCreateMany" payload'
      )
    }

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
  })

  test('persist records to db when find call returns zero rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    const users = await User.updateOrCreateMany('username', [
      {
        username: 'virk',
        email: 'virk@adonisjs.com',
      },
      {
        username: 'nikk',
        email: 'nikk@adonisjs.com',
      },
      {
        username: 'romain',
        email: 'romain@adonisjs.com',
      },
    ])

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')

    assert.isTrue(users[1].$isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')

    assert.isTrue(users[2].$isPersisted)
    assert.equal(users[2].username, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
  })

  test('update records and avoid duplicates', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const users = await User.updateOrCreateMany('username', [
      {
        username: 'virk',
        email: 'virk@adonisjs.com',
        points: 4,
      },
      {
        username: 'nikk',
        email: 'nikk@adonisjs.com',
      },
      {
        username: 'romain',
        email: 'romain@adonisjs.com',
      },
    ])

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')
    assert.equal(users[0].points, 4)

    assert.isTrue(users[1].$isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')
    assert.isUndefined(users[1].points)

    assert.isTrue(users[2].$isPersisted)
    assert.equal(users[2].username, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')
    assert.isUndefined(users[2].points)

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
  })

  test('use multiple keys to predicate a row as unique', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public countryId: number

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      country_id: 1,
      points: 10,
    })

    const users = await User.updateOrCreateMany(
      ['points', 'countryId'],
      [
        {
          username: 'virk1',
          email: 'virk1@adonisjs.com',
          countryId: 1,
          points: 11,
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
          countryId: 2,
          points: 10,
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
          countryId: 3,
          points: 10,
        },
      ]
    )

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].$isPersisted)
    assert.equal(users[0].countryId, 1)
    assert.equal(users[0].points, 11)

    assert.isTrue(users[1].$isPersisted)
    assert.equal(users[1].countryId, 2)
    assert.equal(users[1].points, 10)

    assert.isTrue(users[2].$isPersisted)
    assert.equal(users[2].countryId, 3)
    assert.equal(users[2].points, 10)

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 4)
  })

  test('wrap create calls inside a transaction using updateOrCreateMany', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const trx = await db.transaction()

    await User.updateOrCreateMany(
      'username',
      [
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
      ],
      {
        client: trx,
      }
    )

    await trx.rollback()
    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
  })

  test('wrap update calls inside a custom transaction using updateOrCreateMany', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 10,
    })

    const trx = await db.transaction()

    await User.updateOrCreateMany(
      'username',
      [
        {
          username: 'virk',
          email: 'virk@adonisjs.com',
          points: 4,
        },
        {
          username: 'nikk',
          email: 'nikk@adonisjs.com',
        },
        {
          username: 'romain',
          email: 'romain@adonisjs.com',
        },
      ],
      {
        client: trx,
      }
    )

    await trx.rollback()
    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
    assert.equal(usersList[0].points, 10)
  })

  test('handle concurrent update calls using updateOrCreateMany', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number

      public static boot() {
        if (this.booted) {
          return
        }

        super.boot()
        this.before('update', (model) => {
          model.points += 1
        })
      }
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      email: 'virk@adonisjs.com',
      points: 0,
    })

    await Promise.all([
      User.updateOrCreateMany('username', [
        {
          username: 'virk',
          email: 'virk-1@adonisjs.com',
        },
      ]),
      User.updateOrCreateMany('username', [
        {
          username: 'virk',
          email: 'virk-1@adonisjs.com',
        },
      ]),
    ])

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
    assert.equal(usersList[0].points, 2)
  })
})

test.group('Base Model | hooks', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('invoke before and after create hooks', async (assert) => {
    assert.plan(9)
    const stack: string[] = []

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeCreate()
      public static beforeCreateHook(model: User) {
        stack.push('beforeCreateHook')
        assert.instanceOf(model, User)
        assert.isFalse(model.$isPersisted)
      }

      @beforeSave()
      public static beforeSaveHook(model: User) {
        stack.push('beforeSaveHook')
        assert.instanceOf(model, User)
        assert.isFalse(model.$isPersisted)
      }

      @afterCreate()
      public static afterCreateHook(model: User) {
        stack.push('afterCreateHook')
        assert.instanceOf(model, User)
        assert.isTrue(model.$isPersisted)
      }

      @afterSave()
      public static afterSaveHook(model: User) {
        stack.push('afterSaveHook')
        assert.instanceOf(model, User)
        assert.isTrue(model.$isPersisted)
      }
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.deepEqual(stack, [
      'beforeCreateHook',
      'beforeSaveHook',
      'afterCreateHook',
      'afterSaveHook',
    ])
  })

  test('abort create when before hook raises exception', async (assert) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static boot() {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('create', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isPersisted)
          throw new Error('Wait')
        })

        this.before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isPersisted)
        })

        this.after('create', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isPersisted)
        })

        this.after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isPersisted)
        })
      }
    }

    const user = new User()
    user.username = 'virk'

    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(message, 'Wait')
    }
  })

  test('listen for trx on after save commit', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @afterSave()
      public static afterSaveHook(model: User) {
        if (model.$trx) {
          model.$trx.on('commit', () => {
            assert.isTrue(true)
          })
        }
      }
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx
    await user.save()

    await trx.commit()
  })

  test('listen for trx on after save rollback', async (assert) => {
    assert.plan(1)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @afterSave()
      public static afterSaveHook(model: User) {
        if (model.$trx) {
          model.$trx.on('rollback', () => {
            assert.isTrue(true)
          })
        }
      }
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.$trx = trx
    await user.save()

    await trx.rollback()
  })

  test('invoke before and after update hooks', async (assert) => {
    assert.plan(10)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeUpdate()
      public static beforeUpdateHook(model: User) {
        assert.instanceOf(model, User)
        assert.isTrue(model.$isDirty)
      }

      @beforeSave()
      public static beforeSaveHook(model: User) {
        assert.instanceOf(model, User)
        assert.isTrue(model.$isDirty)
      }

      @afterUpdate()
      public static afterUpdateHook(model: User) {
        assert.instanceOf(model, User)
        assert.isFalse(model.$isDirty)
      }

      @afterSave()
      public static afterSaveHook(model: User) {
        assert.instanceOf(model, User)
        assert.isFalse(model.$isDirty)
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.findOrFail(1)

    user.username = 'nikk'
    await user.save()

    const users = await db.from('users')
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'nikk')
  })

  test('abort update when before hook raises exception', async (assert) => {
    assert.plan(5)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static boot() {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('update', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isDirty)
          throw new Error('Wait')
        })

        this.before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isDirty)
        })

        this.after('update', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isDirty)
        })

        this.after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isDirty)
        })
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.findOrFail(1)

    user.username = 'nikk'

    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(message, 'Wait')
    }

    const users = await db.from('users')
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'virk')
  })

  test('invoke before and after delete hooks', async (assert) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeDelete()
      public static beforeDeleteHook(model: User) {
        assert.instanceOf(model, User)
      }

      @afterDelete()
      public static afterDeleteHook(model: User) {
        assert.instanceOf(model, User)
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.findOrFail(1)
    await user.delete()

    const usersCount = await db.from('users').count('*', 'total')
    assert.equal(usersCount[0].total, 0)
  })

  test('abort delete when before hook raises exception', async (assert) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static boot() {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('delete', (model) => {
          assert.instanceOf(model, User)
          throw new Error('Wait')
        })

        this.after('delete', (model) => {
          assert.instanceOf(model, User)
        })
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.findOrFail(1)

    try {
      await user.delete()
    } catch ({ message }) {
      assert.equal(message, 'Wait')
    }

    const usersCount = await db.from('users').count('*', 'total')
    assert.equal(usersCount[0].total, 1)
  })

  test('invoke before and after fetch hooks', async (assert) => {
    assert.plan(3)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeFetch()
      public static beforeFetchHook(query: ModelQueryBuilder) {
        assert.instanceOf(query, ModelQueryBuilder)
      }

      @afterFetch()
      public static afterFetchHook(users: User[]) {
        assert.lengthOf(users, 1)
        assert.equal(users[0].username, 'virk')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query()
  })

  test('@regression do not invoke after fetch hooks when updating rows', async () => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeFetch()
      public static beforeFetchHook() {
        throw new Error('Never expected to reach here')
      }

      @afterFetch()
      public static afterFetchHook() {
        throw new Error('Never expected to reach here')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query().update({ username: 'nikk' })
  })

  test('@regression do not invoke after fetch hooks when deleting rows', async () => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeFetch()
      public static beforeFetchHook() {
        throw new Error('Never expected to reach here')
      }

      @afterFetch()
      public static afterFetchHook() {
        throw new Error('Never expected to reach here')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query().del()
  })

  test('invoke before and after find hooks', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeFind()
      public static beforeFindHook(query: ModelQueryBuilder) {
        assert.instanceOf(query, ModelQueryBuilder)
      }

      @afterFind()
      public static afterFindHook(user: User) {
        assert.equal(user.username, 'virk')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.find(1)
  })

  test('invoke before and after find hooks when .first method is used', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeFind()
      public static beforeFindHook(query: ModelQueryBuilder) {
        assert.instanceOf(query, ModelQueryBuilder)
      }

      @afterFind()
      public static afterFindHook(user: User) {
        assert.equal(user.username, 'virk')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query().where('id', 1).first()
  })

  test('invoke before and after paginate hooks', async (assert) => {
    assert.plan(5)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforePaginate()
      public static beforePaginateHook([countQuery, query]: [
        ModelQueryBuilder,
        ModelQueryBuilder
      ]) {
        assert.instanceOf(query, ModelQueryBuilder)
        assert.instanceOf(countQuery, ModelQueryBuilder)
        assert.notDeepEqual(countQuery, query)
      }

      @afterPaginate()
      public static afterPaginateHook(paginator: SimplePaginator) {
        assert.equal(paginator.total, 1)
        assert.equal(paginator.all()[0].username, 'virk')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query().paginate(1)
  })

  test('invoke before and after fetch hooks on paginate', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforeFetch()
      public static beforeFetchHook(query: ModelQueryBuilder) {
        assert.instanceOf(query, ModelQueryBuilder)
      }

      @afterFetch()
      public static afterFetchHook(users: User[]) {
        assert.equal(users[0].username, 'virk')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query().paginate(1)
  })

  test('do not invoke before and after paginate hooks when using pojo', async () => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @beforePaginate()
      public static beforePaginateHook() {
        throw new Error('Never expected to reached here')
      }

      @afterPaginate()
      public static afterPaginateHook() {
        throw new Error('Never expected to reached here')
      }
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await User.query().pojo().paginate(1)
  })

  test('@regression resolve update keys when an object is passed', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public theUserName: string

      @column()
      public email: string
    }

    await db.table('users').insert({ username: 'virk' })
    await User.query().update({ theUserName: 'nikk' })

    const users = await db.from('users').select('*')
    assert.equal(users[0].username, 'nikk')
  })

  test('@regression resolve update keys when a key value pair is passed', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column({ columnName: 'username' })
      public theUserName: string

      @column()
      public email: string
    }

    await db.table('users').insert({ username: 'virk' })
    await User.query().update('theUserName', 'nikk')

    const users = await db.from('users').select('*')
    assert.equal(users[0].username, 'nikk')
  })
})

test.group('Base model | extend', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('extend model query builder', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    db.ModelQueryBuilder.macro('whereActive', function () {
      this.where('is_active', true)
      return this
    })

    const knexClient = db.connection().getReadClient()
    const { sql, bindings } = User.query()['whereActive']().toSQL()
    const { sql: knexSql, bindings: knexBindings } = knexClient
      .from('users')
      .where('is_active', true)
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })

  test('extend model insert query builder', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      public $getQueryFor(_, client) {
        return client.insertQuery().table('users').withId()
      }
    }
    User.boot()

    db.InsertQueryBuilder.macro('withId', function () {
      this.returning('id')
      return this
    })

    const knexClient = db.connection().getReadClient()
    const user = new User()

    const { sql, bindings } = user.$getQueryFor('insert', db.connection()).insert({ id: 1 }).toSQL()

    const { sql: knexSql, bindings: knexBindings } = knexClient
      .from('users')
      .returning('id')
      .insert({ id: 1 })
      .toSQL()

    assert.equal(sql, knexSql)
    assert.deepEqual(bindings, knexBindings)
  })
})

test.group('Base Model | aggregates', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('count *', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db
      .insertQuery()
      .table('users')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
    const usersCount = await User.query().count('* as total')
    assert.deepEqual(
      usersCount.map((row) => {
        return {
          total: Number(row.$extras.total),
        }
      }),
      [{ total: 2 }]
    )
  })

  test('count * distinct', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db
      .insertQuery()
      .table('users')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])
    const usersCount = await User.query().countDistinct('username as total')
    assert.deepEqual(
      usersCount.map((row) => {
        return {
          total: Number(row.$extras.total),
        }
      }),
      [{ total: 2 }]
    )
  })
})

test.group('Base Model | date', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('define date column', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public dob: DateTime
    }

    assert.deepEqual(User.$getColumn('dob')!.meta, {
      autoCreate: false,
      autoUpdate: false,
      type: 'date',
    })
  })

  test('define date column and turn on autoCreate flag', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({ autoCreate: true })
      public dob: DateTime
    }

    assert.deepEqual(User.$getColumn('dob')!.meta, {
      autoCreate: true,
      autoUpdate: false,
      type: 'date',
    })
  })

  test('define date column and turn on autoUpdate flag', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({ autoUpdate: true })
      public dob: DateTime
    }

    assert.deepEqual(User.$getColumn('dob')!.meta, {
      autoCreate: false,
      autoUpdate: true,
      type: 'date',
    })
  })

  test('initiate date column values with current date when missing', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({ autoCreate: true })
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (model: User) => {
      assert.instanceOf(model.dob, DateTime)
    })

    user.username = 'virk'
    await user.save()
  })

  test('do initiate date column values with current date when autoCreate is off', async (assert) => {
    assert.plan(2)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({ autoCreate: true })
      public dob: DateTime

      @column.date()
      public createdAt: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (model: User) => {
      assert.instanceOf(model.dob, DateTime)
      assert.isUndefined(model.createdAt)
    })

    user.username = 'virk'
    await user.save()
  })

  test('always update date column value when autoUpdate is on', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({ autoUpdate: true })
      public updatedAt: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('update', (model: User) => {
      assert.instanceOf(model.updatedAt, DateTime)
    })

    user.username = 'virk'
    await user.save()

    user.username = 'nikk'
    await user.save()
  })

  test('format date instance to string before sending to the adapter', async (assert) => {
    assert.plan(1)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({ autoCreate: true })
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.deepEqual(attributes, { username: 'virk', dob: DateTime.local().toISODate() })
    })

    user.username = 'virk'
    await user.save()
  })

  test('leave date untouched when it is defined as string', async (assert) => {
    assert.plan(1)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.deepEqual(attributes, { username: 'virk', dob: '2010-11-20' })
    })

    user.username = 'virk'
    user.dob = '2010-11-20' as any
    await user.save()
  })

  test('do not attempt to format undefined values', async (assert) => {
    assert.plan(1)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.deepEqual(attributes, { username: 'virk' })
    })

    user.username = 'virk'
    await user.save()
  })

  test('raise error when date column value is unprocessable', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter

    user.username = 'virk'
    user.dob = 10 as any
    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_INVALID_DATE_COLUMN_VALUE: The value for "User.dob" must be an instance of "luxon.DateTime"'
      )
    }
  })

  test('raise error when datetime is invalid', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public dob: DateTime
    }

    const user = new User()
    user.dob = DateTime.fromISO('hello-world')
    User.$adapter = adapter

    user.username = 'virk'
    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(message, 'E_INVALID_DATE_COLUMN_VALUE: Invalid value for "User.dob". unparsable')
    }
  })

  test('allow overriding prepare method', async (assert) => {
    assert.plan(1)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({
        autoCreate: true,
        prepare: (value: DateTime) => value.toISOWeekDate(),
      })
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.deepEqual(attributes, { username: 'virk', dob: DateTime.local().toISOWeekDate() })
    })

    user.username = 'virk'
    await user.save()
  })

  test('convert date to datetime instance during fetch', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public createdAt: DateTime
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.find(1)
    assert.instanceOf(user!.createdAt, DateTime)
  })

  test('ignore null or empty values during fetch', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public updatedAt: DateTime
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.find(1)
    assert.isNull(user!.updatedAt)
  })

  test('convert date to toISODate during serialize', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date()
      public createdAt: DateTime
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      created_at: DateTime.local().toISODate(),
    })
    const user = await User.find(1)
    assert.match(user!.toJSON().created_at, /\d{4}-\d{2}-\d{2}/)
  })

  test('do not attempt to serialize, when already a string', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.date({
        consume: (value) =>
          typeof value === 'string'
            ? DateTime.fromSQL(value).minus({ days: 1 }).toISODate()
            : DateTime.fromJSDate(value).minus({ days: 1 }).toISODate(),
      })
      public createdAt: DateTime
    }

    await db.insertQuery().table('users').insert({
      username: 'virk',
      created_at: DateTime.local().toISODate(),
    })
    const user = await User.find(1)
    assert.equal(user!.toJSON().created_at, DateTime.local().minus({ days: 1 }).toISODate())
  })
})

test.group('Base Model | datetime', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('define datetime column', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public dob: DateTime
    }

    assert.deepEqual(User.$getColumn('dob')!.meta, {
      autoCreate: false,
      autoUpdate: false,
      type: 'datetime',
    })
  })

  test('define datetime column and turn on autoCreate flag', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({ autoCreate: true })
      public dob: DateTime
    }

    assert.deepEqual(User.$getColumn('dob')!.meta, {
      autoCreate: true,
      autoUpdate: false,
      type: 'datetime',
    })
  })

  test('define datetime column and turn on autoUpdate flag', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({ autoUpdate: true })
      public dob: DateTime
    }

    assert.deepEqual(User.$getColumn('dob')!.meta, {
      autoCreate: false,
      autoUpdate: true,
      type: 'datetime',
    })
  })

  test('initiate datetime column values with current date when missing', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({ autoCreate: true })
      public joinedAt: DateTime
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
    assert.instanceOf(user.joinedAt, DateTime)

    const createdUser = await db.from('users').select('*').first()

    const clientDateFormat = User.query().client.dialect.dateTimeFormat
    const fetchedJoinedAt =
      createdUser.joined_at instanceof Date
        ? DateTime.fromJSDate(createdUser.joined_at)
        : DateTime.fromSQL(createdUser.joined_at)

    assert.equal(
      fetchedJoinedAt.toFormat(clientDateFormat),
      user.joinedAt.toFormat(clientDateFormat)
    )
  })

  test('ignore undefined values', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.isUndefined(attributes.dob)
    })

    user.username = 'virk'
    await user.save()
  })

  test('ignore string values', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.equal(attributes.dob, localTime)
    })

    const localTime = DateTime.local().toISO()
    user.username = 'virk'
    user.dob = localTime as any
    await user.save()
  })

  test('raise error when datetime column value is unprocessable', async (assert) => {
    assert.plan(1)

    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter

    user.username = 'virk'
    user.dob = 10 as any
    try {
      await user.save()
    } catch ({ message }) {
      assert.equal(
        message,
        'E_INVALID_DATETIME_COLUMN_VALUE: The value for "User.dob" must be an instance of "luxon.DateTime"'
      )
    }
  })

  test('allow overriding prepare method', async (assert) => {
    assert.plan(1)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({
        autoCreate: true,
        prepare: (value: DateTime) => value.toISOWeekDate(),
      })
      public dob: DateTime
    }

    const user = new User()
    User.$adapter = adapter
    adapter.on('insert', (_: User, attributes) => {
      assert.deepEqual(attributes, { username: 'virk', dob: DateTime.local().toISOWeekDate() })
    })

    user.username = 'virk'
    await user.save()
  })

  test('convert timestamp to datetime instance during fetch', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public createdAt: DateTime
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.find(1)
    assert.instanceOf(user!.createdAt, DateTime)
  })

  test('ignore null or empty values during fetch', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public updatedAt: DateTime
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.find(1)
    assert.isNull(user!.updatedAt)
  })

  test('always set datetime value when autoUpdate is true', async (assert) => {
    assert.plan(2)
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      public joinedAt: DateTime
    }

    User.$adapter = adapter
    adapter.on('update', (_, attributes) => {
      assert.property(attributes, 'username')
      assert.property(attributes, 'joined_at')
    })

    const user = new User()
    user.username = 'virk'
    await user.save()

    user.username = 'nikk'
    await user.save()
  })

  test('do not set autoUpdate field datetime when model is not dirty', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      public joinedAt: DateTime
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const originalDateTimeString = user.joinedAt.toString()
    await user.save()
    assert.equal(originalDateTimeString, user.joinedAt.toString())
  })

  test('set datetime when model is dirty but after invoking a hook', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({ autoCreate: true, autoUpdate: true })
      public joinedAt: DateTime

      @beforeSave()
      public static updateUserName(model: User) {
        if (!model.$isPersisted) {
          return
        }
        model.username = 'nikk'
      }
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    const originalDateTimeString = user.joinedAt.toString()
    await user.save()
    assert.notEqual(originalDateTimeString, user.joinedAt.toString())
  }).retry(3)

  test('convert datetime to toISO during serialize', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime()
      public joinedAt: DateTime
    }

    await db
      .insertQuery()
      .table('users')
      .insert({
        username: 'virk',
        joined_at: DateTime.local().toFormat(db.connection().dialect.dateTimeFormat),
      })

    const user = await User.find(1)
    assert.match(
      user!.toJSON().joined_at,
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}(\+|\-)\d{2}:\d{2}/
    )
  })

  test('do not attempt to serialize, when already a string', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column.dateTime({
        consume: (value) =>
          typeof value === 'string'
            ? DateTime.fromSQL(value).minus({ days: 1 }).toISODate()
            : DateTime.fromJSDate(value).minus({ days: 1 }).toISODate(),
      })
      public joinedAt: DateTime
    }

    await db
      .insertQuery()
      .table('users')
      .insert({
        username: 'virk',
        joined_at: DateTime.local().toFormat(db.connection().dialect.dateTimeFormat),
      })

    const user = await User.find(1)
    assert.equal(user!.toJSON().joined_at, DateTime.local().minus({ days: 1 }).toISODate())
  })
})

test.group('Base Model | paginate', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('paginate through rows', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').multiInsert(getUsers(18))
    const users = await User.query().paginate(1, 5)
    users.baseUrl('/users')

    assert.instanceOf(users, ModelPaginator)

    assert.lengthOf(users.all(), 5)
    assert.instanceOf(users.all()[0], User)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 18,
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })
  })

  test('serialize from model paginator', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').multiInsert(getUsers(18))
    const users = await User.query().paginate(1, 5)
    users.baseUrl('/users')

    assert.instanceOf(users, ModelPaginator)
    const { meta, data } = users.serialize({
      fields: ['username'],
    })

    data.forEach((row) => {
      assert.notProperty(row, 'email')
      assert.notProperty(row, 'id')
    })
    assert.deepEqual(meta, {
      total: 18,
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })
  })

  test('return simple paginator instance when using pojo', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').multiInsert(getUsers(18))
    const users = await User.query().pojo().paginate(1, 5)
    users.baseUrl('/users')

    assert.instanceOf(users, SimplePaginator)

    assert.lengthOf(users.all(), 5)
    assert.notInstanceOf(users.all()[0], User)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 18,
      per_page: 5,
      current_page: 1,
      last_page: 4,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=4',
      next_page_url: '/users?page=2',
      previous_page_url: null,
    })
  })

  test('use model naming strategy for pagination properties', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    User.namingStrategy = new SnakeCaseNamingStrategy()
    User.namingStrategy.paginationMetaKeys = () => {
      return {
        total: 'total',
        perPage: 'perPage',
        currentPage: 'currentPage',
        lastPage: 'lastPage',
        firstPage: 'firstPage',
        firstPageUrl: 'firstPageUrl',
        lastPageUrl: 'lastPageUrl',
        nextPageUrl: 'nextPageUrl',
        previousPageUrl: 'previousPageUrl',
      }
    }

    await db.insertQuery().table('users').multiInsert(getUsers(18))
    const users = await User.query().paginate(1, 5)
    users.baseUrl('/users')

    assert.lengthOf(users.all(), 5)
    assert.instanceOf(users.all()[0], User)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 4)
    assert.isTrue(users.hasPages)
    assert.isTrue(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 18)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 18,
      perPage: 5,
      currentPage: 1,
      lastPage: 4,
      firstPage: 1,
      firstPageUrl: '/users?page=1',
      lastPageUrl: '/users?page=4',
      nextPageUrl: '/users?page=2',
      previousPageUrl: null,
    })
  })

  test('use table aliases', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    const usersList = getUsers(18)
    await db.insertQuery().table('users').multiInsert(usersList)

    const users = await User.query()
      .from({ u: User.table })
      .where('u.username', usersList[0].username)
      .paginate(1, 5)

    users.baseUrl('/users')

    assert.instanceOf(users, ModelPaginator)

    assert.lengthOf(users.all(), 1)
    assert.instanceOf(users.all()[0], User)
    assert.equal(users.perPage, 5)
    assert.equal(users.currentPage, 1)
    assert.equal(users.lastPage, 1)
    assert.isFalse(users.hasPages)
    assert.isFalse(users.hasMorePages)
    assert.isFalse(users.isEmpty)
    assert.equal(users.total, 1)
    assert.isTrue(users.hasTotal)
    assert.deepEqual(users.getMeta(), {
      total: 1,
      per_page: 5,
      current_page: 1,
      last_page: 1,
      first_page: 1,
      first_page_url: '/users?page=1',
      last_page_url: '/users?page=1',
      next_page_url: null,
      previous_page_url: null,
    })
  })
})

test.group('Base Model | toObject', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('convert model to its object representation', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toObject(), { username: 'virk', $extras: {} })
  })

  test('use model property key when converting model to object', async (assert) => {
    class User extends BaseModel {
      @column({ serializeAs: 'theUserName', columnName: 'user_name' })
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toObject(), { username: 'virk', $extras: {} })
  })

  test('add computed properties to toObject result', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @computed()
      public get fullName() {
        return this.username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toObject(), { username: 'virk', fullName: 'VIRK', $extras: {} })
  })

  test('do not add computed property when it returns undefined', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @computed()
      public get fullName() {
        return undefined
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.toObject(), { username: 'virk', $extras: {} })
  })

  test('add preloaded hasOne relationship to toObject result', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    const user = new User()
    user.username = 'virk'
    user.$setRelated('profile', new Profile())

    assert.deepEqual(user.toObject(), {
      username: 'virk',
      profile: {
        $extras: {},
      },
      $extras: {},
    })
  })

  test('add preloaded hasMany relationship to toObject result', async (assert) => {
    class Comment extends BaseModel {
      @column()
      public body: string

      @column()
      public postId: number
    }

    class Post extends BaseModel {
      @column()
      public title: string

      @column()
      public userId: number

      @hasMany(() => Comment)
      public comments: HasMany<typeof Comment>
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasMany(() => Post)
      public posts: HasMany<typeof Post>
    }

    const user = new User()
    user.username = 'virk'

    const post = new Post()
    post.title = 'Adonis 101'

    const comment = new Comment()
    comment.body = 'Nice post'

    post.$setRelated('comments', [comment])
    user.$setRelated('posts', [post])

    assert.deepEqual(user.toObject(), {
      username: 'virk',
      posts: [
        {
          title: 'Adonis 101',
          comments: [
            {
              body: 'Nice post',
              $extras: {},
            },
          ],
          $extras: {},
        },
      ],
      $extras: {},
    })
  })
})

test.group('Base model | inheritance', (group) => {
  group.before(async () => {
    app = await setupApplication()
    db = getDb(app)
    BaseModel = getBaseModel(ormAdapter(db), app)
    await setup()
  })

  group.after(async () => {
    await db.manager.closeAll()
    await cleanup()
    await fs.cleanup()
  })

  test('inherit primary key from the base model', async (assert) => {
    class MyBaseModel extends BaseModel {
      public static primaryKey = 'user_id'
    }

    class User extends MyBaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    MyBaseModel.boot()
    User.boot()

    assert.equal(User.primaryKey, 'user_id')
  })

  test('use explicitly defined primary key', async (assert) => {
    class MyBaseModel extends BaseModel {
      public static primaryKey = 'user_id'
    }

    class User extends MyBaseModel {
      public static primaryKey = 'the_user_id'

      @column()
      public username: string

      @column()
      public age: number
    }

    MyBaseModel.boot()
    User.boot()

    assert.equal(User.primaryKey, 'the_user_id')
  })

  test('do not inherit table from the base model', async (assert) => {
    class MyBaseModel extends BaseModel {
      public static table = 'foo'
    }

    class User extends MyBaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    MyBaseModel.boot()
    User.boot()

    assert.equal(User.table, 'users')
  })

  test('inherting a model should copy columns', async (assert) => {
    class MyBaseModel extends BaseModel {
      @column({ isPrimary: true })
      public id: number
    }

    class User extends MyBaseModel {
      @column()
      public username: string

      @column()
      public age: number
    }

    MyBaseModel.boot()
    User.boot()

    assert.deepEqual(
      User.$columnsDefinitions,
      new Map([
        [
          'age',
          {
            columnName: 'age',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'age',
          },
        ],
        [
          'id',
          {
            columnName: 'id',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: true,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'id',
          },
        ],
        [
          'username',
          {
            columnName: 'username',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'username',
          },
        ],
      ])
    )

    assert.deepEqual(User.$keys.attributesToColumns.all(), {
      age: 'age',
      id: 'id',
      username: 'username',
    })

    assert.deepEqual(
      MyBaseModel.$columnsDefinitions,
      new Map([
        [
          'id',
          {
            columnName: 'id',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: true,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'id',
          },
        ],
      ])
    )

    assert.deepEqual(MyBaseModel.$keys.attributesToColumns.all(), {
      id: 'id',
    })
  })

  test('allow overwriting column', async (assert) => {
    class MyBaseModel extends BaseModel {
      @column({ isPrimary: true })
      public userId: string
    }

    class User extends MyBaseModel {
      @column({ isPrimary: true, columnName: 'user_uuid' })
      public declare userId: string

      @column()
      public username: string

      @column()
      public age: number
    }

    MyBaseModel.boot()
    User.boot()

    assert.deepEqual(
      User.$columnsDefinitions,
      new Map([
        [
          'age',
          {
            columnName: 'age',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'age',
          },
        ],
        [
          'userId',
          {
            columnName: 'user_uuid',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: true,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'user_id',
          },
        ],
        [
          'username',
          {
            columnName: 'username',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'username',
          },
        ],
      ])
    )

    assert.deepEqual(User.$keys.attributesToColumns.all(), {
      age: 'age',
      userId: 'user_uuid',
      username: 'username',
    })

    assert.deepEqual(
      MyBaseModel.$columnsDefinitions,
      new Map([
        [
          'userId',
          {
            columnName: 'user_id',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: true,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'user_id',
          },
        ],
      ])
    )

    assert.deepEqual(MyBaseModel.$keys.attributesToColumns.all(), {
      userId: 'user_id',
    })
  })

  test('inherting a model should copy computed properties', async (assert) => {
    class MyBaseModel extends BaseModel {
      @computed()
      public fullName: string
    }

    class User extends MyBaseModel {
      @column()
      public username: string

      @column()
      public age: number

      @computed()
      public score: number
    }

    MyBaseModel.boot()
    User.boot()

    assert.deepEqual(
      User.$columnsDefinitions,
      new Map([
        [
          'age',
          {
            columnName: 'age',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'age',
          },
        ],
        [
          'username',
          {
            columnName: 'username',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'username',
          },
        ],
      ])
    )

    assert.deepEqual(
      User.$computedDefinitions,
      new Map([
        [
          'fullName',
          {
            meta: undefined,
            serializeAs: 'fullName',
          },
        ],
        [
          'score',
          {
            meta: undefined,
            serializeAs: 'score',
          },
        ],
      ])
    )

    assert.deepEqual(User.$keys.attributesToColumns.all(), {
      age: 'age',
      username: 'username',
    })

    assert.deepEqual(MyBaseModel.$columnsDefinitions, new Map([]))
    assert.deepEqual(
      MyBaseModel.$computedDefinitions,
      new Map([
        [
          'fullName',
          {
            meta: undefined,
            serializeAs: 'fullName',
          },
        ],
      ])
    )
    assert.deepEqual(MyBaseModel.$keys.attributesToColumns.all(), {})
  })

  test('allow overwriting computed properties', async (assert) => {
    class MyBaseModel extends BaseModel {
      @computed()
      public fullName: string
    }

    class User extends MyBaseModel {
      @column()
      public username: string

      @column()
      public age: number

      @computed({ serializeAs: 'name' })
      public declare fullName: string
    }

    MyBaseModel.boot()
    User.boot()

    assert.deepEqual(
      User.$columnsDefinitions,
      new Map([
        [
          'age',
          {
            columnName: 'age',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'age',
          },
        ],
        [
          'username',
          {
            columnName: 'username',
            consume: undefined,
            hasGetter: false,
            hasSetter: false,
            isPrimary: false,
            meta: undefined,
            prepare: undefined,
            serialize: undefined,
            serializeAs: 'username',
          },
        ],
      ])
    )

    assert.deepEqual(
      User.$computedDefinitions,
      new Map([
        [
          'fullName',
          {
            meta: undefined,
            serializeAs: 'name',
          },
        ],
      ])
    )

    assert.deepEqual(User.$keys.attributesToColumns.all(), {
      age: 'age',
      username: 'username',
    })

    assert.deepEqual(MyBaseModel.$columnsDefinitions, new Map([]))
    assert.deepEqual(
      MyBaseModel.$computedDefinitions,
      new Map([
        [
          'fullName',
          {
            meta: undefined,
            serializeAs: 'fullName',
          },
        ],
      ])
    )
    assert.deepEqual(MyBaseModel.$keys.attributesToColumns.all(), {})
  })

  test('inherting a model should copy relationships', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }
    class Email extends BaseModel {
      @column()
      public userId: number
    }

    Profile.boot()
    Email.boot()

    class MyBaseModel extends BaseModel {
      @column()
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    class User extends MyBaseModel {
      @hasMany(() => Email)
      public emails: HasMany<typeof Email>
    }

    MyBaseModel.boot()
    User.boot()

    assert.isTrue(User.$relationsDefinitions.has('emails'))
    assert.isTrue(User.$relationsDefinitions.has('profile'))
    assert.isTrue(MyBaseModel.$relationsDefinitions.has('profile'))
    assert.isFalse(MyBaseModel.$relationsDefinitions.has('emails'))
  })

  test('overwrite relationship during relationsip', async (assert) => {
    class SocialProfile extends BaseModel {
      @column()
      public socialParentId: number

      @column()
      public userId: number
    }

    class Profile extends BaseModel {
      @column()
      public userId: number
    }

    class Email extends BaseModel {
      @column()
      public userId: number
    }

    SocialProfile.boot()
    Profile.boot()
    Email.boot()

    class MyBaseModel extends BaseModel {
      @column()
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    class User extends MyBaseModel {
      @hasMany(() => Email)
      public emails: HasMany<typeof Email>

      @hasOne(() => SocialProfile, { foreignKey: 'socialParentId' })
      public declare profile: HasOne<typeof SocialProfile>
    }

    MyBaseModel.boot()
    User.boot()

    assert.deepEqual(User.$getRelation('profile').relatedModel(), SocialProfile)
    assert.deepEqual(User.$getRelation('profile').model, User)

    assert.deepEqual(MyBaseModel.$getRelation('profile').relatedModel(), Profile)
    assert.deepEqual(MyBaseModel.$getRelation('profile').model, MyBaseModel)
  })

  test('allow overwriting relationships', async (assert) => {
    class Profile extends BaseModel {
      @column()
      public userId: number
    }

    class Email extends BaseModel {
      @column()
      public userId: number
    }

    Profile.boot()
    Email.boot()

    class MyBaseModel extends BaseModel {
      @column()
      public id: number

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    class User extends MyBaseModel {
      @hasOne(() => Profile, {
        onQuery() {},
      })
      public declare profile: HasOne<typeof Profile>

      @hasMany(() => Email)
      public emails: HasMany<typeof Email>
    }

    MyBaseModel.boot()
    User.boot()

    assert.isTrue(User.$relationsDefinitions.has('emails'))
    assert.isTrue(User.$relationsDefinitions.has('profile'))
    assert.isTrue(MyBaseModel.$relationsDefinitions.has('profile'))
    assert.isFalse(MyBaseModel.$relationsDefinitions.has('emails'))
    assert.isFunction(User.$relationsDefinitions.get('profile')!['onQueryHook'])
    assert.isUndefined(MyBaseModel.$relationsDefinitions.get('profile')!['onQueryHook'])
  })

  test('inherting a model should copy hooks', async (assert) => {
    function hook1() {}
    function hook2() {}

    class MyBaseModel extends BaseModel {
      public static boot() {
        const isBooted = MyBaseModel.hasOwnProperty('booted') && MyBaseModel.booted === true
        super.boot()

        if (!isBooted) {
          this.before('create', hook1)
        }
      }
    }

    class User extends MyBaseModel {
      public static boot() {
        super.boot()
        this.before('create', hook2)
      }
    }

    MyBaseModel.boot()
    User.boot()

    assert.isTrue(User.$hooks.has('before', 'create', hook1))
    assert.isTrue(User.$hooks.has('before', 'create', hook2))
    assert.isTrue(MyBaseModel.$hooks.has('before', 'create', hook1))
    assert.isFalse(MyBaseModel.$hooks.has('before', 'create', hook2))
  })
})

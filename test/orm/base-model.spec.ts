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
import { HasOne, HasMany } from '@ioc:Adonis/Lucid/Relations'
import { column, computed, hasMany, hasOne } from '../../src/Orm/Decorators'
import {
  getDb,
  cleanup,
  setup,
  mapToObj,
  ormAdapter,
  resetTables,
  FakeAdapter,
  getBaseModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Base model | boot', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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

  test('set increments to true by default', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    assert.isTrue(User.increments)
  })

  test('allow overriding increments', async (assert) => {
    class User extends BaseModel {
      public static increments = false

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    assert.isFalse(User.increments)
  })

  test('initiate all required static properties', async (assert) => {
    class User extends BaseModel {
    }

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

test.group('Base Model | getter-setters', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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
      public set username (value: any) {
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
      public get username () {
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

    assert.deepEqual(user.primaryKeyValue, 1)
  })

  test('invoke getter when accessing value using primaryKeyValue', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public get id () {
        return String(this.$getAttribute('id'))
      }

      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk', id: 1 }

    assert.deepEqual(user.primaryKeyValue, '1')
  })

  test('invoke column serialize method when serializing model', (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public get id () {
        return String(this.$getAttribute('id'))
      }

      @column({
        serialize (value) {
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
})

test.group('Base Model | dirty', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
  })

  test('get dirty properties on a fresh model', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.dirty, { username: 'virk' })
    assert.isTrue(user.isDirty)
  })

  test('get empty object when model is not dirty', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk' }
    user.$original = { username: 'virk' }

    user.isPersisted = true

    assert.deepEqual(user.dirty, {})
    assert.isFalse(user.isDirty)
  })

  test('get empty object when model is not dirty with null values', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()

    user.$attributes = { username: null }
    user.$original = { username: null }
    user.isPersisted = true

    assert.deepEqual(user.dirty, {})
    assert.isFalse(user.isDirty)
  })

  test('get empty object when model is not dirty with false values', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()

    user.$attributes = { username: false }
    user.$original = { username: false }
    user.isPersisted = true

    assert.deepEqual(user.dirty, {})
    assert.isFalse(user.isDirty)
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

    assert.deepEqual(user.dirty, {})
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)

    user.fill({ username: 'virk' })
    assert.deepEqual(user.dirty, { age: null })
  })
})

test.group('Base Model | persist', (group) => {
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

    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'insert',
      instance: user,
      attributes: { username: 'virk', full_name: 'H virk' },
    }])

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
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'insert',
      instance: user,
      attributes: { username: 'virk' },
    }])

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
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'insert',
      instance: user,
      attributes: { username: 'virk' },
    }])

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
    user.isPersisted = true

    await user.save()
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'update',
      instance: user,
      attributes: { username: 'virk' },
    }])

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
    user.isPersisted = true

    await user.save()
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'update',
      instance: user,
      attributes: { username: 'virk' },
    }])

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
    user.isPersisted = true

    await user.save()
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
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

    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.isUndefined(user.updatedAt)

    await user.refresh()
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.isDefined(user.updatedAt)
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

    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
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
    assert.isTrue(user.isPersisted)
    assert.isFalse(user.isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'insert',
      instance: user,
      attributes: { username: 'virk', full_name: 'H VIRK' },
    }])

    assert.deepEqual(user.$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(user.$original, { username: 'virk', fullName: 'H virk' })
  })
})

test.group('Base Model | create from adapter results', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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

    assert.isTrue(user!.isPersisted)
    assert.isFalse(user!.isDirty)
    assert.isFalse(user!.isLocal)
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

    assert.deepEqual(user!.options, { connection: 'foo' })
    assert.isTrue(user!.isPersisted)
    assert.isFalse(user!.isDirty)
    assert.isFalse(user!.isLocal)
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

    assert.isTrue(users[0].isPersisted)
    assert.isFalse(users[0].isDirty)
    assert.isFalse(users[0].isLocal)
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })

    assert.isTrue(users[1].isPersisted)
    assert.isFalse(users[1].isDirty)
    assert.isFalse(users[1].isLocal)
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
      { connection: 'foo' },
    )

    assert.lengthOf(users, 2)

    assert.isTrue(users[0].isPersisted)
    assert.isFalse(users[0].isDirty)
    assert.isFalse(users[0].isLocal)
    assert.deepEqual(users[0].options, { connection: 'foo' })
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })

    assert.isTrue(users[1].isPersisted)
    assert.isFalse(users[1].isDirty)
    assert.isFalse(users[1].isLocal)
    assert.deepEqual(users[1].options, { connection: 'foo' })
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
      null as any],
    )
    assert.lengthOf(users, 1)

    assert.isTrue(users[0].isPersisted)
    assert.isFalse(users[0].isDirty)
    assert.isFalse(users[0].isLocal)
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

    assert.isTrue(user!.isPersisted)
    assert.isFalse(user!.isDirty)
    assert.isFalse(user!.isLocal)
    assert.deepEqual(user!.$attributes, { fullName: 'VIRK' })
    assert.deepEqual(user!.$original, { fullName: 'VIRK' })
  })
})

test.group('Base Model | delete', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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
    assert.deepEqual(adapter.operations, [{
      type: 'delete',
      instance: user,
    }])

    assert.isTrue(user.isDeleted)
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

  test('cherry pick fields', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes({ id: true }), { id: '1' })
  })

  test('ignore fields marked as false', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes({ id: true, username: false }), { id: '1' })
  })

  test('ignore fields that has serializeAs = null, even when part of cherry picking object', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ serializeAs: null })
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes({ id: true }), {})
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

    assert.deepEqual(user.serializeAttributes({ id: true }, true), { id: '1' })
  })

  test('ignore fields marked as false in raw mode', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public id: string
    }

    const user = new User()
    user.username = 'virk'
    user.id = '1'

    assert.deepEqual(user.serializeAttributes({ id: true, username: false }, true), { id: '1' })
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations({ profile: { user_id: true } }), {
      profile: {
        user_id: 1,
      },
    })
  })

  test('select all fields when relationship node value is a boolean', async (assert) => {
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
      public profile: HasOne<Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations({ profile: true }), {
      profile: {
        user_id: 1,
        username: 'virk',
      },
    })
  })

  test('do not select any fields when relationship node value is an object', async (assert) => {
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
      public profile: HasOne<Profile>
    }

    const user = new User()
    const profile = new Profile()
    profile.username = 'virk'
    profile.userId = 1

    user.$setRelated('profile', profile)
    assert.deepEqual(user.serializeRelations({ profile: {} }), {
      profile: {},
    })
  })
})

test.group('Base Model | toJSON', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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
      public get fullName () {
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
      public get fullName () {
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
      public get fullName () {
        return this.username.toUpperCase()
      }
    }

    const user = new User()
    user.username = 'virk'

    assert.deepEqual(user.serialize({ username: true }), { username: 'virk' })
  })
})

test.group('BaseModel | cache', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
  })

  test('cache getter value', (assert) => {
    let invokedCounter = 0

    class User extends BaseModel {
      @column()
      public get username () {
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
      public get username () {
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
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
  })

  test('fill model instance with bulk attributes', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.fill({ username: 'virk', isAdmin: true })
    assert.deepEqual(user.$attributes, { username: 'virk' })
  })

  test('set extra properties via fill', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.fill({ username: 'virk', isAdmin: true })
    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.extras, { isAdmin: true })
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
    user.fill({ username: 'virk', isAdmin: true })
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
    user.merge({ username: 'virk', isAdmin: true })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 22 })
  })

  test('invoke setter when using fill', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column()
      public get age (): number {
        return this.$getAttribute('age')
      }

      public set age (age: number) {
        this.$setAttribute('age', age + 1)
      }
    }

    const user = new User()
    user.age = 22

    assert.deepEqual(user.$attributes, { age: 23 })
    user.fill({ username: 'virk', age: 22 })
    assert.deepEqual(user.$attributes, { username: 'virk', age: 23 })
  })
})

test.group('Base | apdater', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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
    user.options = { connection: 'foo' }

    await user.save()

    assert.deepEqual(adapter.operations, [{
      type: 'insert',
      instance: user,
      attributes: { username: 'virk' },
    }])
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
    user.options = { connection: 'foo' }

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
    user.options = { connection: 'foo' }

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
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
  })

  test('define sideloaded properties using $consumeAdapterResults method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.$consumeAdapterResult({ username: 'virk' }, { loggedInUser: { id: 1 } })

    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.sideloaded, { loggedInUser: { id: 1 } })
  })

  test('define sideloaded properties using $createFromAdapterResult method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = User.$createFromAdapterResult({ username: 'virk' }, { loggedInUser: { id: 1 } })!
    assert.deepEqual(user.$attributes, { username: 'virk' })
    assert.deepEqual(user.sideloaded, { loggedInUser: { id: 1 } })
  })

  test('define sideloaded properties using $createMultipleFromAdapterResult method', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const users = User.$createMultipleFromAdapterResult(
      [{ username: 'virk' }, { username: 'nikk' }],
      { loggedInUser: { id: 1 } },
    )

    assert.deepEqual(users[0].$attributes, { username: 'virk' })
    assert.deepEqual(users[0].sideloaded, { loggedInUser: { id: 1 } })

    assert.deepEqual(users[1].$attributes, { username: 'nikk' })
    assert.deepEqual(users[1].sideloaded, { loggedInUser: { id: 1 } })
  })

  // @todo: PASS SIDELOADED PROPERTIES TO RELATIONSHIPS AS WELL
})

test.group('Base Model | relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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
      public profile: HasOne<Profile>
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
      public profile: Profile
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
      public profile: HasOne<Profile>
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
      public profile: HasOne<Profile>
    }

    const user = new User()
    Profile.$adapter = adapter
    user.$consumeAdapterResult({ id: 1 })

    const profile = await Profile.create({ username: 'virk' })
    user.$setRelated('profile', profile)
    profile.userId = 1

    assert.deepEqual(user.serialize({ id: true, profile: { username: true } }), {
      id: 1,
      profile: {
        username: 'virk',
      },
    })
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
      public profile: HasOne<Profile>
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
      public profiles: HasMany<Profile>
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
      public profiles: HasMany<Profile>
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
      public profiles: HasMany<Profile>
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
      public profile: HasOne<Profile>
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
      public profiles: HasMany<Profile>
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
    assert.equal(user!.primaryKeyValue, 1)
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

    await db.insertQuery().table('users').multiInsert([
      { username: 'virk' },
      { username: 'nikk' },
    ])

    const users = await User.findMany([1, 2])
    assert.lengthOf(users, 2)
    assert.equal(users[0].primaryKeyValue, 2)
    assert.equal(users[1].primaryKeyValue, 1)
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
    assert.isTrue(user.isPersisted)
    assert.instanceOf(user, User)
    assert.equal(user!.primaryKeyValue, 1)
  })

  test('create new row when search criteria doesn\'t match', async (assert) => {
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

    assert.equal(user!.primaryKeyValue, 2)
    assert.isTrue(user.isPersisted)
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
    assert.isTrue(user.isPersisted)
    assert.equal(user!.primaryKeyValue, 1)
  })

  test('instantiate new row when search criteria doesn\'t match using firstOrNew', async (assert) => {
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

    assert.isUndefined(user!.primaryKeyValue)
    assert.isFalse(user.isPersisted)
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
    assert.isTrue(user.isPersisted)
    assert.equal(user.points, 20)
    assert.equal(user.userName, 'virk')

    const users = await db.query().from('users')

    assert.lengthOf(users, 1)
    assert.equal(users[0].points, 20)
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

    assert.isTrue(user.isPersisted)
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

    assert.isTrue(user.isPersisted)
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

    assert.isTrue(user.isPersisted)
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

    const users = await User.fetchOrCreateMany(
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
    )

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')

    assert.isTrue(users[1].isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')

    assert.isTrue(users[2].isPersisted)
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

    const users = await User.fetchOrCreateMany(
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
    )

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')
    assert.equal(users[0].points, 10)

    assert.isTrue(users[1].isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')
    assert.isUndefined(users[1].points)

    assert.isTrue(users[2].isPersisted)
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
      },
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

    const users = await User.fetchOrCreateMany(
      'userName',
      [
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
      ],
    )

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].isPersisted)
    assert.equal(users[0].userName, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')
    assert.equal(users[0].points, 10)

    assert.isTrue(users[1].isPersisted)
    assert.equal(users[1].userName, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')
    assert.isUndefined(users[1].points)

    assert.isTrue(users[2].isPersisted)
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
        },
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
      await User.fetchOrCreateMany(
        'username',
        [
          {
            email: 'virk@adonisjs.com',
          },
          {
            username: 'romain',
            email: 'romain@adonisjs.com',
          },
        ],
      )
    } catch ({ message }) {
      assert.equal(message, 'Value for the "username" is null or undefined inside "fetchOrNewUpMany" payload')
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
      await User.fetchOrCreateMany(
        'username',
        [
          {
            email: 'virk@adonisjs.com',
          },
          {
            username: 'romain',
            email: 'romain@adonisjs.com',
          },
        ],
      )
    } catch ({ message }) {
      assert.equal(message, 'Value for the \"username\" is null or undefined inside \"fetchOrNewUpMany\" payload')
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

    const users = await User.updateOrCreateMany(
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
    )

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')

    assert.isTrue(users[1].isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')

    assert.isTrue(users[2].isPersisted)
    assert.equal(users[2].username, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
  })

  test('update records and avoiding duplicates', async (assert) => {
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

    const users = await User.updateOrCreateMany(
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
    )

    assert.lengthOf(users, 3)
    assert.isTrue(users[0].isPersisted)
    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].email, 'virk@adonisjs.com')
    assert.equal(users[0].points, 4)

    assert.isTrue(users[1].isPersisted)
    assert.equal(users[1].username, 'nikk')
    assert.equal(users[1].email, 'nikk@adonisjs.com')
    assert.isUndefined(users[1].points)

    assert.isTrue(users[2].isPersisted)
    assert.equal(users[2].username, 'romain')
    assert.equal(users[2].email, 'romain@adonisjs.com')
    assert.isUndefined(users[2].points)

    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 3)
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
      },
    )

    await trx.rollback()
    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
  })

  test('wrap update calls inside a transaction using updateOrCreateMany', async (assert) => {
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
      },
    )

    await trx.rollback()
    const usersList = await db.query().from('users')
    assert.lengthOf(usersList, 1)
    assert.equal(usersList[0].points, 10)
  })
})

test.group('Base Model | hooks', (group) => {
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

  test('invoke before and after create hooks', async (assert) => {
    assert.plan(8)

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('create', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isPersisted)
        })

        this.before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isPersisted)
        })

        this.after('create', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isPersisted)
        })

        this.after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isPersisted)
        })
      }
    }

    const user = new User()
    user.username = 'virk'
    await user.save()
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

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('create', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isPersisted)
          throw new Error('Wait')
        })

        this.before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isPersisted)
        })

        this.after('create', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isPersisted)
        })

        this.after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isPersisted)
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

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.after('save', (model) => {
          if (model.trx) {
            model.trx.on('commit', () => {
              assert.isTrue(true)
            })
          }
        })
      }
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.trx = trx
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

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.after('save', (model) => {
          if (model.trx) {
            model.trx.on('rollback', () => {
              assert.isTrue(true)
            })
          }
        })
      }
    }

    const trx = await db.transaction()

    const user = new User()
    user.username = 'virk'
    user.trx = trx
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

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('update', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isDirty)
        })

        this.before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isDirty)
        })

        this.after('update', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isDirty)
        })

        this.after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isDirty)
        })
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

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('update', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isDirty)
          throw new Error('Wait')
        })

        this.before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.isDirty)
        })

        this.after('update', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isDirty)
        })

        this.after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.isDirty)
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

      public static boot () {
        if (this.booted) {
          return
        }

        super.boot()

        this.before('delete', (model) => {
          assert.instanceOf(model, User)
        })

        this.after('delete', (model) => {
          assert.instanceOf(model, User)
        })
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

      public static boot () {
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
})

test.group('Base model | extend', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
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

      public $getQueryFor (_, client) {
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

    const { sql, bindings } = user
      .$getQueryFor('insert', db.connection())
      .insert({ id: 1 })
      .toSQL()

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

  test('count *', async (assert) => {
    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').multiInsert([{ username: 'virk' }, { username: 'nikk' }])
    const usersCount = await User.query().count('* as total')
    assert.deepEqual(usersCount, [{ total: 2 }])
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

    await db.insertQuery().table('users').multiInsert([{ username: 'virk' }, { username: 'nikk' }])
    const usersCount = await User.query().countDistinct('username as total')
    assert.deepEqual(usersCount, [{ total: 2 }])
  })
})

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
import { column, computed, hasOne } from '../../src/Orm/Decorators'
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    assert.equal(User.$table, 'users')
  })

  test('allow overriding table name', async (assert) => {
    class User extends BaseModel {
      public static $table = 'my_users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    assert.equal(User.$table, 'my_users')
  })

  test('set increments to true by default', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    assert.isTrue(User.$increments)
  })

  test('allow overriding increments', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    assert.isFalse(User.$increments)
  })

  test('initiate all required static properties', async (assert) => {
    class User extends BaseModel {
    }

    User.$boot()
    assert.deepEqual(mapToObj(User.$columns), {})
    assert.deepEqual(mapToObj(User.$relations), {})
    assert.deepEqual(mapToObj(User.$computed), {})
    assert.deepEqual(User.$refs, {})
  })

  test('compute refs from the added columns', async (assert) => {
    class User extends BaseModel {
      public static $increments = false

      @column({ primary: true })
      public id: number

      @column()
      public userName: string
    }

    User.$boot()
    assert.deepEqual(User.$refs, { id: 'id', userName: 'user_name' })
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
    User.$boot()

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

    User.$boot()
    const user = new User()
    assert.equal(user.username, 'virk')
  })

  test('get value for primary key', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk', id: 1 }

    assert.deepEqual(user.$primaryKeyValue, 1)
  })

  test('invoke getter when accessing value using $primaryKeyValue', (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public get id () {
        return String(this.$getAttribute('id'))
      }

      @column()
      public username: string
    }

    const user = new User()
    user.$attributes = { username: 'virk', id: 1 }

    assert.deepEqual(user.$primaryKeyValue, '1')
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

    assert.deepEqual(user.$dirty, { username: 'virk' })
    assert.isTrue(user.$isDirty)
  })

  test('get empty object when model is not dirty', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string
    }

    const user = new User()
    user.username = 'virk'
    user.$original = { username: 'virk' }
    user.$persisted = true

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
    user.$persisted = true

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
    user.$persisted = true

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
    assert.isTrue(user.$persisted)

    user.fill({ username: 'virk' })
    assert.deepEqual(user.$dirty, { age: null })
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

  test('persist model with the adapter', async (assert) => {
    const adapter = new FakeAdapter()

    class User extends BaseModel {
      @column()
      public username: string

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.fullName = 'H virk'

    await user.save()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [{
      type: 'insert',
      instance: user,
      attributes: { username: 'virk', full_name: 'H virk' },
    }])

    assert.deepEqual(user.$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(user.$original, { username: 'virk', fullName: 'H virk' })
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
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
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
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
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
    user.$persisted = true

    await user.save()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
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

      @column({ castAs: 'updated_at' })
      public updatedAt: string
    }

    adapter.on('update', (model) => {
      return model.$consumeAdapterResult({ updated_at: '2019-11-20' })
    })

    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    user.$persisted = true

    await user.save()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
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

      @column({ castAs: 'updated_at' })
      public updatedAt: string
    }

    User.$adapter = adapter

    const user = new User()
    user.$persisted = true

    await user.save()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
    assert.deepEqual(adapter.operations, [])
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })

  test('refresh model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ castAs: 'updated_at' })
      public updatedAt: string
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
    assert.isUndefined(user.updatedAt)

    await user.refresh()
    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
    assert.isDefined(user.updatedAt)
  })

  test('raise exception when attempted to refresh deleted row', async (assert) => {
    assert.plan(4)

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public createdAt: string

      @column({ castAs: 'updated_at' })
      public updatedAt: string
    }

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.isTrue(user.$persisted)
    assert.isFalse(user.$isDirty)
    assert.isUndefined(user.updatedAt)

    await db.from('users').del()

    try {
      await user.refresh()
    } catch ({ message }) {
      assert.equal(message, 'Model.reload failed. Unable to lookup users table where id = 1')
    }
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

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult({ username: 'virk' })
    user!.username = 'virk'

    assert.isTrue(user!.$persisted)
    assert.isFalse(user!.$isDirty)
    assert.isFalse(user!.$isLocal)
    assert.deepEqual(user!.$attributes, { username: 'virk' })
    assert.deepEqual(user!.$original, { username: 'virk' })
  })

  test('set options on model instance passed to $createFromAdapterResult', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult({ username: 'virk' }, [], { connection: 'foo' })

    assert.deepEqual(user!.$options, { connection: 'foo' })
    assert.isTrue(user!.$persisted)
    assert.isFalse(user!.$isDirty)
    assert.isFalse(user!.$isLocal)
    assert.deepEqual(user!.$attributes, { username: 'virk' })
    assert.deepEqual(user!.$original, { username: 'virk' })
  })

  test('return null from $createFromAdapterResult when input is not object', (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    const user = User.$createFromAdapterResult([])
    assert.isNull(user)
  })

  test('create multiple model instance using $createMultipleFromAdapterResult', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    const users = User.$createMultipleFromAdapterResult([
      { username: 'virk', full_name: 'H virk' },
      { username: 'prasan' },
    ])
    assert.lengthOf(users, 2)

    assert.isTrue(users[0].$persisted)
    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[0].$isLocal)
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })

    assert.isTrue(users[1].$persisted)
    assert.isFalse(users[1].$isDirty)
    assert.isFalse(users[1].$isLocal)
    assert.deepEqual(users[1].$attributes, { username: 'prasan' })
    assert.deepEqual(users[1].$original, { username: 'prasan' })
  })

  test('pass model options via $createMultipleFromAdapterResult', async (assert) => {
    class User extends BaseModel {
      @column()
      public username: string

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    const users = User.$createMultipleFromAdapterResult(
      [{ username: 'virk', full_name: 'H virk' }, { username: 'prasan' }],
      [],
      { connection: 'foo' },
    )

    assert.lengthOf(users, 2)

    assert.isTrue(users[0].$persisted)
    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[0].$isLocal)
    assert.deepEqual(users[0].$options, { connection: 'foo' })
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })

    assert.isTrue(users[1].$persisted)
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

      @column({ castAs: 'full_name' })
      public fullName: string
    }

    const users = User.$createMultipleFromAdapterResult([
      { username: 'virk', full_name: 'H virk' },
      null as any],
    )
    assert.lengthOf(users, 1)

    assert.isTrue(users[0].$persisted)
    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[0].$isLocal)
    assert.deepEqual(users[0].$attributes, { username: 'virk', fullName: 'H virk' })
    assert.deepEqual(users[0].$original, { username: 'virk', fullName: 'H virk' })
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

  test('do not serialize when serialize is set to false', async (assert) => {
    class User extends BaseModel {
      @column({ serialize: false })
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
    user.$options = { connection: 'foo' }

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
    user.$options = { connection: 'foo' }

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
    user.$options = { connection: 'foo' }

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
      { loggedInUser: { id: 1 } },
    )

    assert.deepEqual(users[0].$attributes, { username: 'virk' })
    assert.deepEqual(users[0].$sideloaded, { loggedInUser: { id: 1 } })

    assert.deepEqual(users[1].$attributes, { username: 'nikk' })
    assert.deepEqual(users[1].$sideloaded, { loggedInUser: { id: 1 } })
  })
})

test.group('Base Model | relations', (group) => {
  group.before(async () => {
    db = getDb()
    BaseModel = getBaseModel(ormAdapter(db))
  })

  group.after(async () => {
    await db.manager.closeAll()
  })

  test('set hasOne relation', (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    const user = new User()
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profile', Profile.create({ username: 'virk' }))

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
      @column({ primary: true })
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

  test('serialize relation toJSON', (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile)
      public profile: Profile
    }

    const user = new User()
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profile', Profile.create({ username: 'virk' }))

    assert.deepEqual(user.toJSON(), {
      id: 1,
      profile: {
        username: 'virk',
      },
    })
  })

  test('serialize relation toJSON with custom serializeAs key', (assert) => {
    class Profile extends BaseModel {
      @column()
      public username: string

      @column()
      public userId: number
    }

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @hasOne(() => Profile, { serializeAs: 'social' })
      public profile: Profile
    }

    const user = new User()
    user.$consumeAdapterResult({ id: 1 })
    user.$setRelated('profile', Profile.create({ username: 'virk' }))

    assert.deepEqual(user.toJSON(), {
      id: 1,
      social: {
        username: 'virk',
      },
    })
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
      @column({ primary: true })
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
      @column({ primary: true })
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
      @column({ primary: true })
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
    assert.equal(users[0].$primaryKeyValue, 2)
    assert.equal(users[1].$primaryKeyValue, 1)
  })

  test('return the existing row when search criteria matches', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrSave({ username: 'virk' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.isTrue(user.$persisted)
    assert.instanceOf(user, User)
    assert.equal(user!.$primaryKeyValue, 1)
  })

  test('create new row when search criteria doesn\'t match', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrSave({ username: 'nikk' }, { email: 'nikk@gmail.com' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 2)
    assert.instanceOf(user, User)

    assert.equal(user!.$primaryKeyValue, 2)
    assert.isTrue(user.$persisted)
    assert.equal(user!.email, 'nikk@gmail.com')
    assert.equal(user!.username, 'nikk')
  })

  test('return the existing row when search criteria matches using firstOrNew', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrNew({ username: 'virk' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.instanceOf(user, User)
    assert.isTrue(user.$persisted)
    assert.equal(user!.$primaryKeyValue, 1)
  })

  test('instantiate new row when search criteria doesn\'t match using firstOrNew', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.firstOrNew({ username: 'nikk' }, { email: 'nikk@gmail.com' })

    const totalUsers = await db.query().from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.instanceOf(user, User)

    assert.isUndefined(user!.$primaryKeyValue)
    assert.isFalse(user.$persisted)
    assert.equal(user!.email, 'nikk@gmail.com')
    assert.equal(user!.username, 'nikk')
  })

  test('update the existing row when search criteria matches', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      @column()
      public points: number
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const user = await User.updateOrCreate({ username: 'virk' }, { points: 20 })
    assert.isTrue(user.$persisted)
    assert.equal(user.points, 20)
    assert.equal(user.username, 'virk')

    const users = await db.query().from('users')

    assert.lengthOf(users, 1)
    assert.equal(users[0].points, 20)
  })

  test('execute updateOrCreate update action inside a transaction', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
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

    const user = await User.updateOrCreate({ username: 'virk' }, { points: 20 }, { client: trx })

    assert.isTrue(user.$persisted)
    assert.equal(user.points, 20)
    assert.equal(user.username, 'virk')

    await trx.rollback()

    const users = await db.query().from('users')
    assert.lengthOf(users, 1)

    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].points, 0)
  })

  test('create a new row when search criteria fails', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
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

    assert.isTrue(user.$persisted)
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
      @column({ primary: true })
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

    assert.isTrue(user.$persisted)
    assert.equal(user.points, 20)
    assert.equal(user.username, 'nikk')

    await trx.rollback()

    const users = await db.query().from('users')
    assert.lengthOf(users, 1)

    assert.equal(users[0].username, 'virk')
    assert.equal(users[0].points, 0)
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$before('create', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$persisted)
        })

        this.$before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$persisted)
        })

        this.$after('create', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$persisted)
        })

        this.$after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$persisted)
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$before('create', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$persisted)
          throw new Error('Wait')
        })

        this.$before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$persisted)
        })

        this.$after('create', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$persisted)
        })

        this.$after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$persisted)
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$after('save', (model) => {
          if (model.$trx) {
            model.$trx.on('commit', () => {
              assert.isTrue(true)
            })
          }
        })
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$after('save', (model) => {
          if (model.$trx) {
            model.$trx.on('rollback', () => {
              assert.isTrue(true)
            })
          }
        })
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$before('update', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isDirty)
        })

        this.$before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isDirty)
        })

        this.$after('update', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isDirty)
        })

        this.$after('save', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isDirty)
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$before('update', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isDirty)
          throw new Error('Wait')
        })

        this.$before('save', (model) => {
          assert.instanceOf(model, User)
          assert.isTrue(model.$isDirty)
        })

        this.$after('update', (model) => {
          assert.instanceOf(model, User)
          assert.isFalse(model.$isDirty)
        })

        this.$after('save', (model) => {
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$before('delete', (model) => {
          assert.instanceOf(model, User)
        })

        this.$after('delete', (model) => {
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
      @column({ primary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string

      public static $boot () {
        if (this.$booted) {
          return
        }

        super.$boot()

        this.$before('delete', (model) => {
          assert.instanceOf(model, User)
          throw new Error('Wait')
        })

        this.$after('delete', (model) => {
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

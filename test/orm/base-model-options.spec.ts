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
import { Profiler } from '@adonisjs/profiler/build/standalone'
import { HasOne } from '@ioc:Adonis/Lucid/Relations'

import { column, hasOne } from '../../src/Orm/Decorators'
import {
  setup,
  getDb,
  cleanup,
  ormAdapter,
  getProfiler,
  resetTables,
  getBaseModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model options | QueryBuilder', (group) => {
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

  test('query builder set model options from the query client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const users = await User.query().exec()
    assert.lengthOf(users, 1)

    assert.equal(users[0].$options!.connection, 'primary')
    assert.instanceOf(users[0].$options!.profiler, Profiler)
  })

  test('query builder set model options when only one row is fetched', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const user = await User.query().first()

    assert.equal(user!.$options!.connection, 'primary')
    assert.instanceOf(user!.$options!.profiler, Profiler)
  })

  test('query builder use transaction when updating rows', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const trx = await db.transaction()

    const users = await User.query({ client: trx }).exec()
    assert.lengthOf(users, 1)

    users[0].username = 'nikk'
    await users[0].save()

    await trx.rollback()

    const usersFresh = await User.query().exec()
    assert.equal(usersFresh[0].username, 'virk')
  })

  test('cleanup transaction reference after commit or rollback', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const trx = await db.transaction()

    const users = await User.query({ client: trx }).exec()
    assert.lengthOf(users, 1)
    await trx.commit()

    assert.isUndefined(users[0].$trx)
    users[0].username = 'nikk'
    await users[0].save()

    const usersFresh = await User.query().exec()
    assert.equal(usersFresh[0].username, 'nikk')
  })
})

test.group('Model options | Adapter', (group) => {
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

  test('use correct client when custom connection is defined', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const user = await User.query({ connection: 'secondary' }).first()
    assert.equal(user!.$options!.connection, 'secondary')
    assert.instanceOf(user!.$options!.profiler, Profiler)
  })

  test('pass profiler to the client when defined explicitly', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const user = await User.query({ profiler }).first()
    assert.equal(user!.$options!.connection, 'primary')
    assert.deepEqual(user!.$options!.profiler, profiler)
  })

  test('pass custom client to query builder', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const client = db.connection()

    const user = await User.query({ client }).first()
    assert.equal(user!.$options!.connection, 'primary')
  })

  test('pass transaction client to query builder', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const trx = await db.connection('secondary').transaction()
    const user = await User.query({ client: trx }).first()
    await trx.rollback()

    assert.equal(user!.$options!.connection, 'secondary')
  })
})

test.group('Model options | Model.find', (group) => {
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

  test('define custom connection', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const user = await User.find(1, { connection: 'secondary' })
    assert.equal(user!.$options!.connection, 'secondary')
    assert.instanceOf(user!.$options!.profiler, Profiler)
  })

  test('define custom profiler', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const user = await User.find(1, { profiler })
    assert.deepEqual(user!.$options!.profiler, profiler)
  })

  test('define custom query client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection()

    const user = await User.find(1, { client })
    assert.deepEqual(user!.$options!.profiler, client.profiler)
    assert.deepEqual(user!.$options!.connection, client.connectionName)
  })
})

test.group('Model options | Model.findOrFail', (group) => {
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

  test('define custom connection', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const user = await User.findOrFail(1, { connection: 'secondary' })
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom profiler', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const customDb = getDb()
    await customDb.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const user = await User.findOrFail(1, { profiler })
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom query client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection('secondary')

    const user = await User.findOrFail(1, { client })
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })
})

test.group('Model options | Model.findMany', (group) => {
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

  test('define custom connection', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const users = await User.findMany([1], { connection: 'secondary' })
    assert.equal(users[0].$options!.connection, 'secondary')
    assert.instanceOf(users[0].$options!.profiler, Profiler)
  })

  test('define custom profiler', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const users = await User.findMany([1], { profiler })
    assert.deepEqual(users[0].$options!.profiler, profiler)
  })

  test('define custom query client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection('secondary')

    const users = await User.findMany([1], { client })
    assert.deepEqual(users[0].$options!.profiler, client.profiler)
    assert.deepEqual(users[0].$options!.connection, client.connectionName)
  })
})

test.group('Model options | Model.firstOrCreate', (group) => {
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

  test('define custom connection', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const user = await User.firstOrCreate({ username: 'virk' }, undefined, { connection: 'secondary' })
    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom connection when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const user = await User.firstOrCreate({ username: 'nikk' }, undefined, { connection: 'secondary' })
    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 2)
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom profiler', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const user = await User.firstOrCreate({ username: 'virk' }, undefined, { profiler })
    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'primary')
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom profiler when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const user = await User.firstOrCreate({ username: 'nikk' }, undefined, { profiler })
    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 2)
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection('secondary')

    const user = await User.firstOrCreate({ username: 'virk' }, undefined, { client })
    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('define custom client when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection('secondary')

    const user = await User.firstOrCreate({ username: 'nikk' }, undefined, { client })
    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 2)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('use transaction', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = await db.connection('secondary').transaction()

    const user = await User.firstOrCreate({ username: 'virk' }, undefined, { client })
    await client.commit()

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('use transaction to save when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const client = await db.connection('secondary').transaction()

    const user = await User.firstOrCreate({ username: 'virk' }, undefined, { client })
    await client.rollback()

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 0)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })
})

test.group('Model options | Model.fetchOrCreateMany', (group) => {
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

  test('define custom connection', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const [user] = await User.fetchOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { connection: 'secondary' },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom connection when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const [user] = await User.fetchOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { connection: 'secondary' },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom profiler', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const [user] = await User.fetchOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { profiler },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'primary')
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom profiler when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const profiler = getProfiler()
    const [user] = await User.fetchOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { profiler },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'primary')
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection('secondary')

    const [user] = await User.fetchOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { client },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('define custom client when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const client = db.connection('secondary')

    const [user] = await User.fetchOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { client },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('wrap create many calls inside a transaction', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    try {
      await User.fetchOrCreateMany(
        'username',
        [
          { username: 'virk', email: 'foo@bar.com' },
          { username: 'nikk', email: 'foo@bar.com' },
          { username: 'romain', email: 'foo@bar.com' },
        ],
      )
    } catch (error) {
      assert.exists(error)
    }

    const total = await db.from('users').count('*', 'total')
    assert.equal(total[0].total, 0)
  })

  test('use existing transaction when passed', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    const trx = await db.transaction()
    trx.transaction = async function () {
      throw new Error('Never expected to be invoked')
    }

    await User.fetchOrCreateMany(
      'username',
      [
        { username: 'virk', email: 'foo@bar.com' },
      ],
      { client: trx },
    )

    assert.isFalse(trx.isCompleted)
    await trx.rollback()

    const total = await db.from('users').count('*', 'total')
    assert.equal(total[0].total, 0)
  })
})

test.group('Model options | Model.updateOrCreateMany', (group) => {
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

  test('define custom connection', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })

    const [user] = await User.updateOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { connection: 'secondary' },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom connection when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const [user] = await User.updateOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { connection: 'secondary' },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'secondary')
    assert.instanceOf(user.$options!.profiler, Profiler)
  })

  test('define custom profiler', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const profiler = getProfiler()

    const [user] = await User.updateOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { profiler },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'primary')
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom profiler when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const profiler = getProfiler()
    const [user] = await User.updateOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { profiler },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.equal(user.$options!.connection, 'primary')
    assert.deepEqual(user.$options!.profiler, profiler)
  })

  test('define custom client', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    const client = db.connection('secondary')

    const [user] = await User.updateOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { client },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('define custom client when search fails', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    const client = db.connection('secondary')

    const [user] = await User.updateOrCreateMany(
      'username',
      [{ username: 'virk' }],
      { client },
    )

    const total = await db.from('users').count('*', 'total')

    assert.equal(total[0].total, 1)
    assert.deepEqual(user.$options!.profiler, client.profiler)
    assert.deepEqual(user.$options!.connection, client.connectionName)
  })

  test('wrap update many calls inside a transaction', async (assert) => {
    assert.plan(2)

    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    try {
      await User.updateOrCreateMany(
        'username',
        [
          { username: 'virk', email: 'foo@bar.com' },
          { username: 'nikk', email: 'foo@bar.com' },
          { username: 'romain', email: 'foo@bar.com' },
        ],
      )
    } catch (error) {
      assert.exists(error)
    }

    const total = await db.from('users').count('*', 'total')
    assert.equal(total[0].total, 0)
  })

  test('use existing transaction when passed', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @column()
      public email: string
    }

    const trx = await db.transaction()
    trx.transaction = async function () {
      throw new Error('Never expected to be invoked')
    }

    await User.updateOrCreateMany(
      'username',
      [
        { username: 'virk', email: 'foo@bar.com' },
      ],
      { client: trx },
    )

    assert.isFalse(trx.isCompleted)
    await trx.rollback()

    const total = await db.from('users').count('*', 'total')
    assert.equal(total[0].total, 0)
  })
})

test.group('Model options | Query Builder Preloads', (group) => {
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

  test('pass query options to preloaded models', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const users = await User.query({ connection: 'secondary' }).preload('profile').exec()
    assert.lengthOf(users, 1)

    assert.equal(users[0].$options!.connection, 'secondary')
    assert.instanceOf(users[0].$options!.profiler, Profiler)

    assert.equal(users[0].profile.$options!.connection, 'secondary')
    assert.instanceOf(users[0].profile.$options!.profiler, Profiler)
  })

  test('use transaction client to execute preload queries', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const trx = await db.transaction()
    const users = await User.query({ client: trx }).preload('profile').exec()
    await trx.commit()

    assert.lengthOf(users, 1)

    assert.equal(users[0].$options!.connection, 'primary')
    assert.deepEqual(users[0].$options!.profiler, trx.profiler)

    assert.equal(users[0].profile.$options!.connection, 'primary')
    assert.deepEqual(users[0].profile.$options!.profiler, trx.profiler)
  })

  test('pass profiler to preload models', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const profiler = getProfiler()
    const users = await User.query({ profiler }).preload('profile').exec()

    assert.lengthOf(users, 1)

    assert.equal(users[0].$options!.connection, 'primary')
    assert.deepEqual(users[0].$options!.profiler, profiler)

    assert.equal(users[0].profile.$options!.connection, 'primary')
    assert.deepEqual(users[0].profile.$options!.profiler, profiler)
  })

  test('pass sideloaded data to preloads', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const users = await User.query().sideload({ id: 1 }).preload('profile').exec()

    assert.lengthOf(users, 1)

    assert.equal(users[0].$options!.connection, 'primary')
    assert.deepEqual(users[0].$sideloaded, { id: 1 })
    assert.deepEqual(users[0].profile.$sideloaded, { id: 1 })
  })

  test('custom sideloaded data on preload query must win', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const users = await User.query().sideload({ id: 1 }).preload('profile', (builder) => {
      builder.sideload({ id: 2 })
    }).exec()

    assert.lengthOf(users, 1)

    assert.equal(users[0].$options!.connection, 'primary')
    assert.deepEqual(users[0].$sideloaded, { id: 1 })
    assert.deepEqual(users[0].profile.$sideloaded, { id: 2 })
  })

  test('use transaction client to update preloaded rows', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const trx = await db.transaction()
    const users = await User.query({ client: trx }).preload('profile').exec()

    assert.lengthOf(users, 1)

    users[0].profile.displayName = 'Nikk'
    await users[0].profile.save()

    await trx.rollback()

    const profiles = await Profile.all()
    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].displayName, 'Virk')
  })

  test('cleanup transaction reference after commit or rollback', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const trx = await db.transaction()
    const users = await User.query({ client: trx }).preload('profile').exec()

    assert.lengthOf(users, 1)
    await trx.commit()

    assert.isUndefined(users[0].$trx)
    assert.isUndefined(users[0].profile.$trx)

    users[0].profile.displayName = 'Nikk'
    await users[0].profile.save()

    const profiles = await Profile.all()
    assert.lengthOf(profiles, 1)
    assert.equal(profiles[0].displayName, 'Nikk')
  })
})

test.group('Model options | Model Preloads', (group) => {
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

  test('pass query options to preloaded models', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const user = await User.query({ connection: 'secondary' }).firstOrFail()
    assert.equal(user.$options!.connection, 'secondary')

    await user.preload('profile')

    assert.equal(user.profile.$options!.connection, 'secondary')
    assert.instanceOf(user.profile.$options!.profiler, Profiler)
  })

  test('pass profiler to preload models', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const profiler = getProfiler()
    const user = await User.query({ profiler }).firstOrFail()

    assert.equal(user.$options!.connection, 'primary')
    assert.deepEqual(user.$options!.profiler, profiler)

    await user.preload('profile')

    assert.equal(user.profile.$options!.connection, 'primary')
    assert.deepEqual(user.profile.$options!.profiler, profiler)
  })

  test('pass sideloaded data to preloads', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const user = await User.query().sideload({ id: 1 }).firstOrFail()
    assert.deepEqual(user.$sideloaded, { id: 1 })

    await user.preload('profile')
    assert.deepEqual(user.profile.$sideloaded, { id: 1 })
  })

  test('custom sideloaded data on preload query must win', async (assert) => {
    class Profile extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public userId: number

      @column()
      public displayName: string
    }

    class User extends BaseModel {
      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string

      @hasOne(() => Profile)
      public profile: HasOne<typeof Profile>
    }

    await db.insertQuery().table('users').insert({ username: 'virk' })
    await db.insertQuery().table('profiles').insert({ user_id: 1, display_name: 'Virk' })

    const user = await User.query().sideload({ id: 1 }).firstOrFail()
    assert.deepEqual(user.$sideloaded, { id: 1 })

    await user.preload('profile', (query) => query.sideload({ id: 2 }))
    assert.deepEqual(user.profile.$sideloaded, { id: 2 })
  })
})

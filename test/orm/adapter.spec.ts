/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { column } from '../../src/orm/decorators/index.js'

import { setup, cleanup, getDb, getBaseModel, ormAdapter } from '../../test-helpers/index.js'
import { AppFactory } from '@adonisjs/core/factories/app'

test.group('Adapter', (group) => {
  group.each.setup(async () => {
    await setup()
  })

  group.each.teardown(async () => {
    await cleanup()
  })

  test('make insert call using a model', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)
  })

  test('make update call using a model', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)

    user.username = 'nikk'
    assert.isTrue(user.$isDirty)
    assert.deepEqual(user.$dirty, { username: 'nikk' })

    await user.save()
  })

  test('make delete call using a model', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)

    await user.delete()
    assert.isTrue(user.$isDeleted)

    const users = await db.from('users').select('*')
    assert.lengthOf(users, 0)
  })

  test('get array of model instances using the all call', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    await db
      .table('users')
      .returning('id')
      .multiInsert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()

    assert.lengthOf(users, 2)
    assert.instanceOf(users[0], User)
    assert.instanceOf(users[1], User)

    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[1].$isDirty)

    assert.deepEqual(users[0].$attributes, { id: 2, username: 'nikk' })
    assert.deepEqual(users[1].$attributes, { id: 1, username: 'virk' })
  })

  test('use transaction client set on the model for the insert', async ({ fs, assert }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    User.boot()
    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'
    await user.save()
    await trx.commit()

    const totalUsers = await db.from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.exists(user.id)
    assert.isUndefined(user.$trx)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)
  })

  test('do not insert when transaction rollbacks', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    User.boot()
    const trx = await db.transaction()

    const user = new User()
    user.$trx = trx
    user.username = 'virk'
    await user.save()
    await trx.rollback()

    const totalUsers = await db.from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.exists(user.id)
    assert.isUndefined(user.$trx)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)
  })

  test('cleanup old trx event listeners when transaction is updated', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }

    User.boot()
    const trx = await db.transaction()
    const trx1 = await trx.transaction()

    const user = new User()
    user.$trx = trx1
    user.$trx = trx
    user.username = 'virk'

    await trx1.rollback()
    assert.deepEqual(user.$trx, trx)
    await trx.rollback()
  })

  test('use transaction client set on the model for the update', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)

    const trx = await db.transaction()
    user.$trx = trx
    user.username = 'nikk'
    await user.save()
    await trx.rollback()

    const users = await db.from('users')
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'virk')
  })

  test('use transaction client set on the model for the delete', async ({ assert, fs }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)

    const trx = await db.transaction()
    user.$trx = trx

    await user.delete()
    await trx.rollback()

    const users = await db.from('users').select('*')
    assert.lengthOf(users, 1)
  })

  test('set primary key value when colun name is different from attribute name', async ({
    assert,
    fs,
  }) => {
    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter, app)

    class User extends BaseModel {
      static$table = 'users'

      @column({ isPrimary: true, columnName: 'id' })
      declare userId: number

      @column()
      declare username: string
    }

    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.userId)
    assert.deepEqual(user.$attributes, { username: 'virk', userId: user.userId })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$isPersisted)
  })
})

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
import { column } from '../../src/Orm/Decorators'
import { setup, cleanup, getDb, resetTables, getBaseModel, ormAdapter } from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Adapter', (group) => {
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

  test('make insert call using a model', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)
  })

  test('make update call using a model', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)

    user.username = 'nikk'
    assert.isTrue(user.isDirty)
    assert.deepEqual(user.dirty, { username: 'nikk' })

    await user.save()
  })

  test('make delete call using a model', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)

    await user.delete()
    assert.isTrue(user.isDeleted)

    const users = await db.from('users').select('*')
    assert.lengthOf(users, 0)
  })

  test('get array of model instances using the all call', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    await db.table('users').returning('id').multiInsert(
      [{ username: 'virk' }, { username: 'nikk' }],
    )

    const users = await User.all()

    assert.lengthOf(users, 2)
    assert.instanceOf(users[0], User)
    assert.instanceOf(users[1], User)

    assert.isFalse(users[0].isDirty)
    assert.isFalse(users[1].isDirty)

    assert.deepEqual(users[0].$attributes, { id: 2, username: 'nikk' })
    assert.deepEqual(users[1].$attributes, { id: 1, username: 'virk' })
  })

  test('use transaction client set on the model for the insert', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    const trx = await db.transaction()

    const user = new User()
    user.trx = trx
    user.username = 'virk'
    await user.save()
    await trx.commit()

    const totalUsers = await db.from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 1)
    assert.exists(user.id)
    assert.isUndefined(user.trx)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)
  })

  test('do not insert when transaction rollbacks', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    const trx = await db.transaction()

    const user = new User()
    user.trx = trx
    user.username = 'virk'
    await user.save()
    await trx.rollback()

    const totalUsers = await db.from('users').count('*', 'total')

    assert.equal(totalUsers[0].total, 0)
    assert.exists(user.id)
    assert.isUndefined(user.trx)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)
  })

  test('cleanup old trx event listeners when transaction is updated', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }

    User.boot()
    const trx = await db.transaction()
    const trx1 = await trx.transaction()

    const user = new User()
    user.trx = trx1
    user.trx = trx
    user.username = 'virk'

    await trx1.rollback()
    assert.deepEqual(user.trx, trx)
    await trx.rollback()
  })

  test('use transaction client set on the model for the update', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)

    const trx = await db.transaction()
    user.trx = trx
    user.username = 'nikk'
    await user.save()
    await trx.rollback()

    const users = await db.from('users')
    assert.lengthOf(users, 1)
    assert.equal(users[0].username, 'virk')
  })

  test('use transaction client set on the model for the delete', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true })
      public id: number

      @column()
      public username: string
    }
    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)

    const trx = await db.transaction()
    user.trx = trx

    await user.delete()
    await trx.rollback()

    const users = await db.from('users').select('*')
    assert.lengthOf(users, 1)
  })

  test('set primary key value when colun name is different from attribute name', async (assert) => {
    class User extends BaseModel {
      public static $table = 'users'

      @column({ isPrimary: true, columnName: 'id' })
      public userId: number

      @column()
      public username: string
    }

    User.boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.userId)
    assert.deepEqual(user.$attributes, { username: 'virk', userId: user.userId })
    assert.isFalse(user.isDirty)
    assert.isTrue(user.isPersisted)
  })
})

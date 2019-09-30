/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import { column } from '../src/Orm/Decorators'
import { setup, cleanup, getDb, resetTables, getBaseModel, ormAdapter } from '../test-helpers'

test.group('Adapter', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('make insert call using a model', async (assert) => {
    const BaseModel = getBaseModel(ormAdapter())

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$persisted)
  })

  test('make update call using a model', async (assert) => {
    const BaseModel = getBaseModel(ormAdapter())

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$persisted)

    user.username = 'nikk'
    assert.isTrue(user.$isDirty)
    assert.deepEqual(user.$dirty, { username: 'nikk' })

    await user.save()
  })

  test('make delete call using a model', async (assert) => {
    const db = getDb()
    const BaseModel = getBaseModel(ormAdapter())

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$persisted)

    await user.delete()
    assert.isTrue(user.$isDeleted)

    const users = await db.from('users').select('*')
    assert.lengthOf(users, 0)
  })

  test('get array of model instances using the all call', async (assert) => {
    const db = getDb()
    const BaseModel = getBaseModel(ormAdapter())

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()

    await db.table('users').returning('id').multiInsert(
      [{ username: 'virk' }, { username: 'nikk' }],
    )

    const users = await User.all()

    assert.lengthOf(users, 2)
    assert.instanceOf(users[0], User)
    assert.instanceOf(users[1], User)

    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[1].$isDirty)

    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[1].$attributes, { id: 2, username: 'nikk' })
  })
})

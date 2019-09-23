/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import { BaseModel } from '../src/Orm/BaseModel'
import { column } from '../src/Orm/Decorators'
import { setup, cleanup, getDb, resetTables } from '../test-helpers'
import { Adapter } from '../src/Orm/Adapter'

test.group('BaseModel', (group) => {
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
    const adapter = new Adapter(getDb())

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()
    User.$adapter = adapter

    const user = new User()
    user.username = 'virk'
    await user.save()

    assert.exists(user.id)
    assert.deepEqual(user.$attributes, { username: 'virk', id: user.id })
    assert.isFalse(user.$isDirty)
    assert.isTrue(user.$persisted)
  })

  test('make update call using a model', async (assert) => {
    const adapter = new Adapter(getDb())

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()
    User.$adapter = adapter

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
    const adapter = new Adapter(db)

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()
    User.$adapter = adapter

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

  test('get model instance using the find call', async (assert) => {
    const db = getDb()
    const adapter = new Adapter(db)

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()
    User.$adapter = adapter

    const [id] = await db.table('users').returning('id').insert({ username: 'virk' })

    const user = await User.findBy('username', 'virk')
    assert.instanceOf(user, User)
    assert.isFalse(user!.$isDirty)
    assert.deepEqual(user!.$attributes, { id: id, username: 'virk' })
  })

  test('get array of model instances using the findAll call', async (assert) => {
    const db = getDb()
    const adapter = new Adapter(db)

    class User extends BaseModel {
      public static $table = 'users'

      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }
    User.$boot()
    User.$adapter = adapter

    await db.table('users').returning('id').multiInsert(
      [{ username: 'virk' }, { username: 'nikk' }],
    )

    const users = await User.findAll()

    assert.lengthOf(users, 2)
    assert.instanceOf(users[0], User)
    assert.instanceOf(users[1], User)

    assert.isFalse(users[0].$isDirty)
    assert.isFalse(users[1].$isDirty)

    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[1].$attributes, { id: 2, username: 'nikk' })
  })
})

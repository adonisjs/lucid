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
import { ModelQueryBuilder } from '../src/Orm/QueryBuilder'
import { getBaseModel, ormAdapter, getDb, setup, cleanup, resetTables } from '../test-helpers'

test.group('Model query builder', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('get instance of query builder for the given model', async (assert) => {
    const BaseModel = getBaseModel(ormAdapter())

    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    assert.instanceOf(User.query(), ModelQueryBuilder)
  })

  test('pre select the table for the query builder instance', async (assert) => {
    const BaseModel = getBaseModel(ormAdapter())
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    assert.equal(User.query()['$knexBuilder']._single.table, 'users')
  })

  test('execute select queries', async (assert) => {
    const BaseModel = getBaseModel(ormAdapter())
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    const db = getDb()
    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query().where('username', 'virk')
    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
  })
})

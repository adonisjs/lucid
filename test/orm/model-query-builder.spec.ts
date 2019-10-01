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
import { ModelQueryBuilder } from '../../src/Orm/QueryBuilder'
import {
  getDb,
  setup,
  cleanup,
  ormAdapter,
  resetTables,
  getProfiler,
  getBaseModel,
} from '../../test-helpers'

let db: ReturnType<typeof getDb>
let BaseModel: ReturnType<typeof getBaseModel>

test.group('Model query builder', (group) => {
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

  test('get instance of query builder for the given model', async (assert) => {
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
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query().where('username', 'virk')
    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
  })

  test('pass custom connection to the model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query({ connection: 'secondary' }).where('username', 'virk')
    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[0].$options!.connection, 'secondary')
  })

  test('pass sideloaded attributes to the model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User
      .query({ connection: 'secondary' })
      .where('username', 'virk')
      .sideload({ loggedInUser: { id: 1 } })

    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[0].$sideloaded, { loggedInUser: { id: 1 } })
  })

  test('pass custom profiler to the model instance', async (assert) => {
    class User extends BaseModel {
      @column({ primary: true })
      public id: number

      @column()
      public username: string
    }

    User.$boot()
    await db.insertQuery().table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const profiler = getProfiler()
    const users = await User.query({ profiler }).where('username', 'virk')
    assert.lengthOf(users, 1)
    assert.instanceOf(users[0], User)
    assert.deepEqual(users[0].$attributes, { id: 1, username: 'virk' })
    assert.deepEqual(users[0].$options!.profiler, profiler)
  })
})

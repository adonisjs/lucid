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

test.group('BaseModel', () => {
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
})

/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseModel } from '../../src/orm/model.js'

test.group('Model', () => {
  test('extract instance properties of a model', ({ assert, expectTypeOf }) => {
    class User extends BaseModel {
      declare fullName: string
    }
    User.boot()
    const user = new User()
    user.fullName = 'Harminder Virk'

    assert.deepEqual(user.toObject(), {
      fullName: 'Harminder Virk',
    })
    expectTypeOf(user.toObject()).toEqualTypeOf<{
      fullName: string
    }>()
  })

  test('extract getters registered as attributes', ({ assert, expectTypeOf }) => {
    class User extends BaseModel {
      get fullName(): string {
        return 'Harminder Virk'
      }
    }
    User.boot()
    User.defineAttribute('fullName', {})
    const user = new User()

    assert.deepEqual(user.toObject(), {
      fullName: 'Harminder Virk',
    })
    expectTypeOf(user.toObject()).toEqualTypeOf<{
      fullName: string
    }>()
  })

  test('do not extract getters not registered as attributes', ({ assert, expectTypeOf }) => {
    class User extends BaseModel {
      get fullName(): string {
        return 'Harminder Virk'
      }
    }
    User.boot()
    const user = new User()

    assert.deepEqual(user.toObject(), {})

    /**
     * Type mis-match, but there isn't way to know if the key
     * is marked as attribute or not at types level.
     */
    expectTypeOf(user.toObject()).toEqualTypeOf<{
      fullName: string
    }>()
  })

  test('convert model to object with "preventAccessingMissingAttributes" flag', ({
    assert,
    expectTypeOf,
  }) => {
    class User extends BaseModel {
      static preventAccessingMissingAttributes: boolean = true
      declare fullName: string | undefined
    }

    User.boot()
    User.defineAttribute('fullName', {})
    const user = new User()

    assert.deepEqual(user.toObject(), {})
    expectTypeOf(user.toObject()).toEqualTypeOf<{
      fullName: string | undefined
    }>()
  })
})

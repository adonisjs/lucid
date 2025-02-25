/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import deepEqual from 'fast-deep-equal'
import { BaseModel } from '../../../src/orm/model.js'

test.group('Model | dirty', () => {
  test('return false when checking a non-attribute property', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
      declare isAdmin: boolean
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()
    user.firstName = 'Harminder'
    user.lastName = 'Virk'
    user.isAdmin = false

    assert.isFalse(user.isDirty('isAdmin'))
    assert.isTrue(user.isDirty('firstName'))
    assert.isTrue(user.isDirty('lastName'))
    assert.deepEqual(user.$dirty, {
      firstName: 'Harminder',
      lastName: 'Virk',
    })
  })

  test('return true when value is set and model has not been persisted', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()
    user.firstName = 'Harminder'

    assert.isTrue(user.isDirty('firstName'))
    assert.isFalse(user.isDirty('lastName'))
    assert.deepEqual(user.$dirty, {
      firstName: 'Harminder',
    })
  })

  test('compare primitive values', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
      declare karma: number
      declare isAdmin: boolean
      declare deletedAt: null | Date
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})
    User.defineAttribute('karma', {})
    User.defineAttribute('isAdmin', {})
    User.defineAttribute('deletedAt', {})

    const user = new User()
    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
      lastName: 'Virk',
      karma: 0,
      isAdmin: false,
      deletedAt: null,
    })
    user.$isPersisted = true

    assert.isFalse(user.isDirty('firstName'))
    assert.isFalse(user.isDirty('lastName'))
    assert.isFalse(user.isDirty('karma'))
    assert.isFalse(user.isDirty('isAdmin'))
    assert.isFalse(user.isDirty('deletedAt'))

    user.karma = 10
    user.deletedAt = new Date()

    assert.isTrue(user.isDirty('karma'))
    assert.isTrue(user.isDirty('deletedAt'))
    assert.deepEqual(user.$dirty, {
      karma: 10,
      deletedAt: user.deletedAt,
    })
  })

  test('compare objects', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
      declare address: any
      declare deletedAt: null | Date
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})
    User.defineAttribute('address', {})
    User.defineAttribute('deletedAt', {})

    const user = new User()
    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
      lastName: 'Virk',
      address: {
        city: 'Gurugram',
        state: 'Haryana',
      },
      deletedAt: new Date(),
    })
    user.$isPersisted = true

    assert.isFalse(user.isDirty('firstName'))
    assert.isFalse(user.isDirty('lastName'))
    assert.isFalse(user.isDirty('address'))
    assert.isFalse(user.isDirty('deletedAt'))

    /**
     * Reset address to same value but different object
     * reference.
     */
    user.address = {
      city: 'Gurugram',
      state: 'Haryana',
    }
    user.deletedAt = null

    assert.isFalse(user.isDirty('address'))
    assert.isTrue(user.isDirty('deletedAt'))

    /**
     * Mutate object property
     */
    user.address.city = 'Gurgaon'
    assert.isTrue(user.isDirty('address'))
  })

  test('compare value objects', ({ assert }) => {
    class JSONValueObject {
      constructor(public props: any) {}

      isDirty(originalValue: JSONValueObject) {
        return !deepEqual(this.props, originalValue.props)
      }

      static consume(props: string) {
        return new JSONValueObject(JSON.parse(props))
      }
    }

    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
      declare address: JSONValueObject
      declare deletedAt: null | Date
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})
    User.defineAttribute('address', {
      consume(value: string) {
        return JSONValueObject.consume(value)
      },
    })
    User.defineAttribute('deletedAt', {})

    const user = new User()
    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
      lastName: 'Virk',
      address: JSON.stringify({
        city: 'Gurugram',
        state: 'Haryana',
      }),
      deletedAt: new Date(),
    })
    user.$isPersisted = true

    assert.isFalse(user.isDirty('firstName'))
    assert.isFalse(user.isDirty('lastName'))
    assert.isFalse(user.isDirty('address'))
    assert.isFalse(user.isDirty('deletedAt'))

    /**
     * Reset address to same value but different object
     * reference.
     */
    user.address = new JSONValueObject({
      city: 'Gurugram',
      state: 'Haryana',
    })
    user.deletedAt = null

    assert.isFalse(user.isDirty('address'))
    assert.isTrue(user.isDirty('deletedAt'))

    /**
     * Mutate object property
     */
    user.address.props.city = 'Gurgaon'
    assert.isTrue(user.isDirty('address'))
  })
})

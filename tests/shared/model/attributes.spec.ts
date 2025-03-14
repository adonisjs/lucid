/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseModel } from '../../../src/orm/model.js'

test.group('Model | attributes', () => {
  test('set value within $attributes when property is an attribute', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()
    user.firstName = 'Harminder'
    user.lastName = 'Virk'

    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
      lastName: 'Virk',
    })
    assert.deepEqual(user.$original, {})
    assert.equal(user.firstName, 'Harminder')
    assert.equal(user.lastName, 'Virk')
    assert.equal(user.fullName, 'Harminder Virk')
  })

  test('do not set within $attribute when property has a setter', ({ assert }) => {
    class User extends BaseModel {
      #lastName?: string
      declare firstName: string

      set lastName(name: string) {
        this.#lastName = name.toUpperCase()
      }
      get lastName(): string | undefined {
        return this.#lastName
      }

      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()
    user.firstName = 'Harminder'
    user.lastName = 'Virk'

    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
    })
    assert.deepEqual(user.$original, {})
    assert.equal(user.firstName, 'Harminder')
    assert.equal(user.lastName, 'VIRK')
    assert.equal(user.fullName, 'Harminder VIRK')
  })

  test('allow setters to set attributes', ({ assert }) => {
    class User extends BaseModel {
      #lastName?: string
      declare firstName: string

      set lastName(name: string) {
        this.#lastName = name.toUpperCase()
        this.setAttribute('lastName', this.#lastName)
      }
      get lastName(): string | undefined {
        return this.#lastName
      }

      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()
    user.firstName = 'Harminder'
    user.lastName = 'Virk'

    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
      lastName: 'VIRK',
    })
    assert.deepEqual(user.$original, {})
    assert.equal(user.firstName, 'Harminder')
    assert.equal(user.lastName, 'VIRK')
    assert.equal(user.fullName, 'Harminder VIRK')
  })

  test('throw error when trying to read value of missing properties', ({ assert }) => {
    class User extends BaseModel {
      static preventAccessingMissingAttributes = true

      declare firstName: string
      declare lastName: string

      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()

    /**
     * Allow checking if the property exists
     */
    assert.isFalse('firstName' in user)
    assert.isFalse('lastName' in user)

    /**
     * Disallow reading value
     */
    assert.throws(
      () => user.firstName,
      'The property User.firstName either does not exist or was not retrieved from the database'
    )
    assert.throws(
      () => user.lastName,
      'The property User.lastName either does not exist or was not retrieved from the database'
    )
  })

  test('do not throw when reading undefined value but preventAccessingMissingAttributes is disabled', ({
    assert,
  }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string

      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()

    assert.isFalse('firstName' in user)
    assert.isFalse('lastName' in user)
    assert.isUndefined(user.firstName)
    assert.isUndefined(user.lastName)
  })

  test('do not throw when reading value is explicitly set to undefined or null', ({ assert }) => {
    class User extends BaseModel {
      static preventAccessingMissingAttributes = true
      declare firstName?: string
      declare lastName?: string | null

      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()
    user.firstName = undefined
    user.lastName = null

    assert.isTrue('firstName' in user)
    assert.isTrue('lastName' in user)
    assert.isUndefined(user.firstName)
    assert.isNull(user.lastName)
  })

  test('do not throw when value is defined and not declared', ({ assert }) => {
    class User extends BaseModel {
      static preventAccessingMissingAttributes = true
      firstName?: string
    }

    User.boot()
    User.defineAttribute('firstName', {})

    const user = new User()
    assert.isTrue('firstName' in user)
    assert.isUndefined(user.firstName)
  })

  test('assign default value to the instance property', ({ assert }) => {
    class User extends BaseModel {
      firstName: string = 'Guest'
      declare lastName: string

      get fullName() {
        return `${this.firstName} ${this.lastName}`
      }
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()

    assert.deepEqual(user.$attributes, {
      firstName: 'Guest',
    })
    assert.deepEqual(user.$original, {})
    assert.equal(user.firstName, 'Guest')
    assert.equal(user.fullName, 'Guest undefined')
  })
})

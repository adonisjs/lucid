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

test.group('Model | hydrate | attributes', () => {
  test('set attributes when hydrating a model', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})

    const user = new User()

    /**
     * Partial hydrate
     */
    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
    })
    assert.equal(user.firstName, 'Harminder')
    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
    })
    assert.deepEqual(user.$original, {
      firstName: 'Harminder',
    })
    assert.notStrictEqual(user.$attributes, user.$original)

    /**
     * Partial hydrate
     */
    user.hydrateUsingAdapterResults({
      lastName: 'Virk',
    })
    assert.equal(user.lastName, 'Virk')
    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
      lastName: 'Virk',
    })
    assert.deepEqual(user.$original, {
      firstName: 'Harminder',
      lastName: 'Virk',
    })
    assert.notStrictEqual(user.$attributes, user.$original)
  })

  test('invoke decorator consume method when setting the value', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {
      consume(value: string) {
        return value.toUpperCase()
      },
    })

    const user = new User()

    /**
     * Partial hydrate
     */
    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
    })
    assert.equal(user.firstName, 'Harminder')
    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
    })
    assert.deepEqual(user.$original, {
      firstName: 'Harminder',
    })
    assert.notStrictEqual(user.$attributes, user.$original)

    /**
     * Partial hydrate
     */
    user.hydrateUsingAdapterResults({
      lastName: 'Virk',
    })
    assert.equal(user.lastName, 'VIRK')
    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
      lastName: 'VIRK',
    })
    assert.deepEqual(user.$original, {
      firstName: 'Harminder',
      lastName: 'VIRK',
    })
    assert.notStrictEqual(user.$attributes, user.$original)
  })

  test('invoke cast consume method when setting the value', ({ assert }) => {
    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})
    User.defineCast('lastName', {
      consume(value: string) {
        return value.toUpperCase()
      },
    })

    const user = new User()

    /**
     * Partial hydrate
     */
    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
    })
    assert.equal(user.firstName, 'Harminder')
    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
    })
    assert.deepEqual(user.$original, {
      firstName: 'Harminder',
    })
    assert.notStrictEqual(user.$attributes, user.$original)

    /**
     * Partial hydrate
     */
    user.hydrateUsingAdapterResults({
      lastName: 'Virk',
    })
    assert.equal(user.lastName, 'VIRK')
    assert.deepEqual(user.$attributes, {
      firstName: 'Harminder',
      lastName: 'VIRK',
    })
    assert.deepEqual(user.$original, {
      firstName: 'Harminder',
      lastName: 'VIRK',
    })
    assert.notStrictEqual(user.$attributes, user.$original)
  })

  test('set value objects', ({ assert }) => {
    class JSONValueObject {
      constructor(public props: any) {}

      static consume(props: string) {
        return new JSONValueObject(JSON.parse(props))
      }
    }

    class User extends BaseModel {
      declare firstName: string
      declare lastName: string
      declare address: JSONValueObject
    }

    User.boot()
    User.defineAttribute('firstName', {})
    User.defineAttribute('lastName', {})
    User.defineAttribute('address', {})
    User.defineCast('address', JSONValueObject)

    const user = new User()

    user.hydrateUsingAdapterResults({
      firstName: 'Harminder',
      address: JSON.stringify({ city: 'Gurugram', state: 'Haryana', country: 'India' }),
    })

    assert.deepEqual(user.address.props, { city: 'Gurugram', state: 'Haryana', country: 'India' })
    assert.deepEqual(user.$original.address.props, {
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
    })

    /**
     * Mutating original should not impact the originals
     */
    user.address.props.city = 'Gurgaon'
    assert.deepEqual(user.address.props, { city: 'Gurgaon', state: 'Haryana', country: 'India' })
    assert.deepEqual(user.$original.address.props, {
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
    })
  })
})

test.group('Model | hydrate | properties', () => {
  test('set properties when hydrating a model', ({ assert }) => {
    class User extends BaseModel {
      karma!: string
    }

    User.boot()
    const user = new User()

    user.hydrateUsingAdapterResults({
      karma: '10',
    })
    assert.strictEqual(user.karma, '10')
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })

  test('cast properties when hydrating a model', ({ assert }) => {
    class User extends BaseModel {
      karma!: number
    }

    User.boot()
    User.defineCast('karma', {
      consume(value: string) {
        return Number(value)
      },
    })
    const user = new User()

    user.hydrateUsingAdapterResults({
      karma: '10',
    })
    assert.strictEqual(user.karma, 10)
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })

  test('do not attempt to cast when property is not in result set', ({ assert }) => {
    class User extends BaseModel {
      karma!: number
    }

    User.boot()
    User.defineCast('karma', {
      consume(value: string) {
        return Number(value)
      },
    })
    const user = new User()

    user.hydrateUsingAdapterResults({})
    assert.equal(user.karma, undefined)
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })

  test('set value in $extras when not defined as a model property', ({ assert }) => {
    class User extends BaseModel {}

    User.boot()
    User.defineCast('karma', {
      consume(value: string) {
        return Number(value)
      },
    })
    const user = new User()

    user.hydrateUsingAdapterResults({
      karma: '10',
    })
    assert.deepEqual(user.$extras, {
      karma: 10,
    })
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })

  test('do not override default values when hydrating', ({ assert }) => {
    class User extends BaseModel {
      karma: string = '0'
    }

    User.boot()
    const user = new User()

    user.hydrateUsingAdapterResults({})
    assert.strictEqual(user.karma, '0')
    assert.deepEqual(user.$attributes, {})
    assert.deepEqual(user.$original, {})
  })
})

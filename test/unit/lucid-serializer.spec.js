'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const CollectionSerializer = require('../../src/Lucid/Serializers/Collection')

test.group('Relations | Serializer', (group) => {
  group.before(async () => {
    ioc.singleton('Adonis/Src/Database', function () {
      const config = new Config()
      config.set('database', {
        connection: 'testing',
        testing: helpers.getConfig()
      })
      return new DatabaseManager(config)
    })
    ioc.alias('Adonis/Src/Database', 'Database')

    await fs.ensureDir(path.join(__dirname, './tmp'))
    await helpers.createTables(ioc.use('Adonis/Src/Database'))
  })

  group.afterEach(async () => {
    await ioc.use('Adonis/Src/Database').table('users').truncate()
    await ioc.use('Adonis/Src/Database').table('my_users').truncate()
    await ioc.use('Adonis/Src/Database').table('profiles').truncate()
    await ioc.use('Adonis/Src/Database').table('pictures').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('return serializer instance when returning multiple rows', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()
    assert.instanceOf(users, CollectionSerializer)
  })

  test('return json representation of all the models', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()

    const json = users.toJSON()
    assert.isArray(json)
    assert.lengthOf(json, 2)
    assert.deepEqual(json.map((user) => user.username), ['virk', 'nikk'])
  })

  test('call getters when returning json', async (assert) => {
    class User extends Model {
      getUsername (username) {
        return username.toUpperCase()
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()

    const json = users.toJSON()
    assert.deepEqual(json.map((user) => user.username), ['VIRK', 'NIKK'])
  })

  test('attach computed properties when calling toJSON', async (assert) => {
    class User extends Model {
      static get computed () {
        return ['salutedName']
      }

      getSalutedName (attrs) {
        return `Mr. ${attrs.username}`
      }
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.all()

    const json = users.toJSON()
    assert.deepEqual(json.map((user) => user.salutedName), ['Mr. virk', 'Mr. nikk'])
  })

  test('attach relations when calling toJSON', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, profile_name: 'virk' }, { user_id: 2, profile_name: 'nikk' }])

    const users = await User.query().with('profile').fetch()

    const json = users.toJSON()
    assert.property(json[0], 'profile')
    assert.property(json[1], 'profile')
    assert.equal(json[0].profile.user_id, json[0].id)
    assert.equal(json[1].profile.user_id, json[1].id)
  })

  test('attach nested relations when calling toJSON', async (assert) => {
    class Picture extends Model {
    }

    class Profile extends Model {
      picture () {
        return this.hasOne(Picture)
      }
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Picture._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, profile_name: 'virk' }, { user_id: 2, profile_name: 'nikk' }])
    await ioc.use('Database').table('pictures').insert({ profile_id: 1, storage_path: '/foo' })

    const users = await User.query().with('profile.picture').fetch()

    const json = users.toJSON()
    assert.property(json[0].profile, 'picture')
    assert.equal(json[0].profile.picture.profile_id, 1)
    assert.isNull(json[1].profile.picture)
  })

  test('attach pagination meta data when calling toJSON', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    const users = await User.query().paginate()

    const json = users.toJSON()
    assert.property(json, 'data')
    assert.isArray(json.data)
    assert.equal(json.page, 1)
    assert.equal(json.total, 2)
    assert.equal(json.perPage, 20)
    assert.equal(json.lastPage, 1)
  })

  test('attach sideloaded data as meta', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, profile_name: 'virk' }, { user_id: 2, profile_name: 'nikk' }])

    const users = await User.query().withCount('profile').paginate()

    const json = users.toJSON()
    assert.property(json, 'data')
    assert.isArray(json.data)
    assert.deepEqual(json.data[0].__meta__, { profile_count: helpers.formatNumber(1) })
    assert.equal(json.page, 1)
    assert.equal(json.total, 2)
    assert.equal(json.perPage, 20)
    assert.equal(json.lastPage, 1)
  })
})

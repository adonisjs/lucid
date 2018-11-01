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
const VanillaSerializer = require('../../src/Lucid/Serializers/Vanilla')

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
    ioc.use('Database').close()
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
    assert.instanceOf(users, VanillaSerializer)
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

  test('test toJSON with default visible() and hidden()', async (assert) => {
    class User extends Model {
    }
    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    // Test 1 - find in DB
    const a = await User.find(1)
    assert.include(a.toJSON(), { id: 1, username: 'virk' })
  })

  test('test toJSON with visible()', async (assert) => {
    class User extends Model {
      static get visible () {
        return ['id', 'username']
      }
    }
    User._bootIfNotBooted()
    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])

    // Test 1 - find in DB
    const a = await User.find(1)
    assert.deepEqual(a.toJSON(), { id: 1, username: 'virk' }, 'Test 1 failed')

    // // test 2 - find in db then reload
    const b = await User.find(1)
    await b.reload()
    assert.deepEqual(b.toJSON(), { id: 1, username: 'virk' }, 'Test 2 failed')

    // // test 3 - create
    const c = await User.create({ username: 'ben' })
    assert.deepEqual(c.toJSON(), { id: 3, username: 'ben' }, 'Test 3 failed')

    // // test 4 - create then reload from db
    const d = await User.create({ username: 'simon' })
    await d.reload()
    assert.deepEqual(d.toJSON(), { id: 4, username: 'simon' }, 'Test 4 failed')
  })

  test('return nth child', async (assert) => {
    class User extends Model {
    }

    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    const users = await User.all()
    assert.equal(users.nth(0).username, 'virk')
    assert.equal(users.nth(1).username, 'nikk')
    assert.isNull(users.nth(2))
  })
})

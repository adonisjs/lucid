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

test.group('Relations | Belongs To', (group) => {
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
    await ioc.use('Adonis/Src/Database').table('profiles').truncate()
    await ioc.use('Adonis/Src/Database').table('pictures').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    await fs.remove(path.join(__dirname, './tmp'))
  })

  test('fetch related row via first method', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })

    const profile = await Profile.find(1)
    await profile.user().first()
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "id" = ? limit ?'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([1, 1]))
  })

  test('fetch related row via fetch method', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })

    const profile = await Profile.find(1)
    await profile.user().fetch()
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "id" = ? limit ?'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([1, 1]))
  })

  test('fetch relation with different ids', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 2, profile_name: 'nikk' })

    const profile = await Profile.find(1)
    await profile.user().fetch()
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "id" = ? limit ?'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([2, 1]))
  })

  test('eagerload related instance', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 2, profile_name: 'nikk' })

    const profiles = await Profile.query().with('user').fetch()
    assert.instanceOf(profiles, CollectionSerializer)
    assert.equal(profiles.size(), 1)
    assert.instanceOf(profiles.first().getRelated('user'), User)
    assert.equal(profiles.first().getRelated('user').username, 'nikk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "id" in (?)'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([2]))
  })

  test('eagerload and paginate', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([
      { user_id: 2, profile_name: 'nikk' },
      { user_id: 1, profile_name: 'virk' }
    ])

    const profiles = await Profile.query().with('user').paginate()
    assert.instanceOf(profiles, CollectionSerializer)
    assert.equal(profiles.size(), 2)
    assert.instanceOf(profiles.first().getRelated('user'), User)
    assert.equal(profiles.first().getRelated('user').username, 'nikk')
    assert.instanceOf(profiles.last().getRelated('user'), User)
    assert.equal(profiles.last().getRelated('user').username, 'virk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "id" in (?, ?)'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([2, 1]))
  })

  test('work fine with nested relations', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Picture extends Model {
      profile () {
        return this.belongsTo(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Picture._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 3, username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ id: 22, user_id: 3, profile_name: 'virk' })
    await ioc.use('Database').table('pictures').insert({ profile_id: 22, storage_path: '/foo' })

    const pictures = await Picture.query().with('profile.user').fetch()
    assert.instanceOf(pictures.first().getRelated('profile'), Profile)
    assert.instanceOf(pictures.first().getRelated('profile').getRelated('user'), User)
    assert.equal(pictures.first().getRelated('profile').profile_name, 'virk')
    assert.equal(pictures.first().getRelated('profile').getRelated('user').username, 'virk')
  })

  test('make right json structure when calling toJSON', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Picture extends Model {
      profile () {
        return this.belongsTo(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Picture._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ id: 3, username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ id: 22, user_id: 3, profile_name: 'virk' })
    await ioc.use('Database').table('pictures').insert({ profile_id: 22, storage_path: '/foo' })

    const picture = await Picture.query().with('profile.user').first()
    const json = picture.toJSON()
    assert.equal(json.profile_id, json.profile.id)
    assert.equal(json.profile.user_id, json.profile.user.id)
  })

  test('sideload relation count', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    class Picture extends Model {
      profile () {
        return this.belongsTo(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Picture._bootIfNotBooted()

    let pictureQuery = null
    Picture.onQuery((query) => (pictureQuery = query))

    await ioc.use('Database').table('users').insert({ id: 3, username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ id: 22, user_id: 3, profile_name: 'virk' })
    await ioc.use('Database').table('pictures').insert({ profile_id: 22, storage_path: '/foo' })

    const picture = await Picture.query().withCount('profile').first()
    assert.deepEqual(picture.$sideLoaded, { profile_count: helpers.formatNumber(1) })
    assert.equal(pictureQuery.sql, helpers.formatQuery('select *, (select count(*) from "profiles" where pictures.profile_id = profiles.id) as "profile_count" from "pictures" limit ?'))
  })

  test('filter parent via has clause', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 2, profile_name: 'nikk' })

    const profiles = await Profile.query().has('user').fetch()
    assert.equal(profiles.size(), 1)
    assert.equal(profiles.first().profile_name, 'nikk')
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where exists (select * from "users" where profiles.user_id = users.id)'))
  })

  test('add count constraints to has', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 2, profile_name: 'nikk' })

    const profiles = await Profile.query().has('user', '>', 1).fetch()
    assert.equal(profiles.size(), 0)
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where (select count(*) from "users" where profiles.user_id = users.id) > ?'))
  })

  test('add additional constraints via whereHas', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([
      { user_id: 2, profile_name: 'nikk' },
      { user_id: 1, profile_name: 'virk' }
    ])

    const profiles = await Profile.query().whereHas('user', (builder) => builder.where('profile_name', 'virk')).fetch()
    assert.equal(profiles.size(), 1)
    assert.equal(profiles.first().profile_name, 'virk')
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where exists (select * from "users" where "profile_name" = ? and profiles.user_id = users.id)'))
  })

  test('add whereDoesntHave clause', async (assert) => {
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([
      { user_id: 2, profile_name: 'nikk' },
      { user_id: 1, profile_name: 'virk' }
    ])

    const profiles = await Profile.query().whereDoesntHave('user', (builder) => builder.where('profile_name', 'virk')).fetch()
    assert.equal(profiles.size(), 1)
    assert.equal(profiles.first().profile_name, 'nikk')
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where not exists (select * from "users" where "profile_name" = ? and profiles.user_id = users.id)'))
  })
})

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

test.group('Relations | HasOne', (group) => {
  group.before(async () => {
    ioc.bind('Adonis/Src/Database', function () {
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
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Adonis/Src/Database'))
    await fs.remove(path.join(__dirname, './tmp'))
  })

  test('hasOne relation should make right query', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })
    const user = new User()
    user.id = 1
    const profile = await user.profile().load()
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" = ? limit ?'))
    assert.deepEqual(profileQuery.bindings, helpers.formatBindings([1, 1]))
    assert.instanceOf(profile, Profile)
    assert.equal(profile.$attributes.user_id, 1)
  })

  test('hasOne relation should make right query for multiple rows', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })
    const user = new User()
    const profiles = await user.profile().eagerLoad([1, 2])
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" in (?, ?)'))
    assert.deepEqual(profileQuery.bindings, helpers.formatBindings([1, 2]))
    assert.instanceOf(profiles, CollectionSerializer)
    assert.equal(profiles.size(), 1)
  })

  test('fetch related row', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    const user = new User()
    user.username = 'virk'
    await user.save()
    await ioc.use('Database').table('profiles').insert({ user_id: user.id, profile_name: 'virk' })
    const profile = await user.profile().fetch()
    assert.instanceOf(profile, Profile)
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" = ? limit ?'))
    assert.deepEqual(profileQuery.bindings, helpers.formatBindings([1, 1]))
  })

  test('throw exception when trying to fetch row with undefined binding', async (assert) => {
    assert.plan(1)
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    const user = new User()
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })
    try {
      const profile = await user.profile().fetch()
    } catch ({ message }) {
      assert.equal(message, 'E_UNSAVED_MODEL_INSTANCE: Cannot process relation, since User model is not persisted to database or relational value is undefined')
    }
  })

  test('update related model', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    const user = new User()
    user.username = 'virk'
    await user.save()
    await ioc.use('Database').table('profiles').insert({ user_id: user.id, profile_name: 'virk' })
    await user.profile().where('profile_name', 'virk').update({ profile_name: 'hv' })
    assert.equal(profileQuery.sql, helpers.formatQuery('update "profiles" set "profile_name" = ?, "updated_at" = ? where "profile_name" = ? and "user_id" = ?'))
    assert.deepEqual(profileQuery.bindings, ['hv', profileQuery.bindings[1], 'virk', 1])
  })

  test('call static methods on related model', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    const user = new User()
    user.username = 'virk'
    await user.save()
    await ioc.use('Database').table('profiles').insert({ user_id: user.id, profile_name: 'virk', likes: 3 })
    await user.profile().increment('likes', 1)
    assert.equal(profileQuery.sql, helpers.formatQuery('update "profiles" set "likes" = "likes" + 1 where "user_id" = ?'))
  })

  test('eagerload and set relation on model instance', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    const user = new User()
    user.username = 'virk'
    await user.save()
    await ioc.use('Database').table('profiles').insert({ user_id: user.id, profile_name: 'virk', likes: 3 })
    await user.load('profile')
    assert.instanceOf(user.$relations.profile, Profile)
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" = ? limit ?'))
  })

  test('filter results while eagerloading', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let profileQuery = null
    Profile.onQuery((query) => profileQuery = query)

    const user = new User()
    user.username = 'virk'
    await user.save()
    await ioc.use('Database').table('profiles').insert({ user_id: user.id, profile_name: 'virk', likes: 3 })
    await user.load('profile', (builder) => {
      builder.where('profile_name', 'nikk')
    })
    assert.isNull(user.$relations.profile)
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "profile_name" = ? and "user_id" = ? limit ?'))
  })

  test('load multiple relations', async (assert) => {
    class Profile extends Model {
    }

    class Identity extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }

      identities () {
        return this.hasOne(Identity)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Identity._bootIfNotBooted()

    let profileQuery = null
    let identityQuery = null

    Profile.onQuery((query) => profileQuery = query)
    Identity.onQuery((query) => identityQuery = query)

    const user = new User()
    user.username = 'virk'
    await user.save()
    await ioc.use('Database').table('profiles').insert({ user_id: user.id, profile_name: 'virk', likes: 3 })
    await ioc.use('Database').table('identities').insert({ user_id: user.id })

    await user.load('profile')
    await user.load('identities')
    assert.property(user.$relations, 'profile')
    assert.property(user.$relations, 'identities')
    assert.instanceOf(user.$relations.profile, Profile)
    assert.instanceOf(user.$relations.identities, Identity)
  })
})

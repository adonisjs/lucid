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
    await ioc.use('Adonis/Src/Database').table('identities').truncate()
    await ioc.use('Adonis/Src/Database').table('cars').truncate()
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
    Profile.onQuery((query) => (profileQuery = query))

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
    Profile.onQuery((query) => (profileQuery = query))

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

    const user = new User()
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })
    try {
      await user.profile().fetch()
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
    Profile.onQuery((query) => (profileQuery = query))

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
    Profile.onQuery((query) => (profileQuery = query))

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
    Profile.onQuery((query) => (profileQuery = query))

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
    Profile.onQuery((query) => (profileQuery = query))

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

  test('map whereIn values for array of model instances', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').insert([{ username: 'virk' }, { username: 'nikk' }]).into('users')
    const users = await User.all()
    const userInstances = users.rows
    const values = users.first().profile().mapValues(userInstances)
    assert.deepEqual(userInstances.map((user) => user.id), values)
  })

  test('map whereIn values for different primary keys', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }

      vProfile () {
        return this.hasOne(Profile, 'vid')
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').insert([{ username: 'virk', vid: 100 }, { username: 'nikk', vid: 101 }]).into('users')
    const users = await User.all()
    const userInstances = users.rows
    const values = users.first().profile().mapValues(userInstances)
    const vValues = users.first().vProfile().mapValues(userInstances)
    assert.deepEqual(userInstances.map((user) => user.id), values)
    assert.deepEqual(userInstances.map((user) => user.vid), vValues)
  })

  test('group related rows for each unique instance', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').insert([{ username: 'virk' }, { username: 'nikk' }]).into('users')
    const users = await User.all()

    /**
     * Fake profile 1 for 2nd user
     */
    const fakeProfile1 = new Profile()
    fakeProfile1.id = 1
    fakeProfile1.user_id = users.rows[1].id

    /**
     * Fake profile 2 but for first user
     */
    const fakeProfile2 = new Profile()
    fakeProfile2.id = 2
    fakeProfile2.user_id = users.rows[0].id

    const { values: grouped } = users.first().profile().group([fakeProfile1, fakeProfile2])
    assert.lengthOf(grouped, 2)

    assert.equal(grouped[0].identity, 2) // 2nd user
    assert.equal(grouped[0].value.id, 1) // 1st profile
    assert.equal(grouped[0].value.user_id, 2) // 2nd user id

    assert.equal(grouped[1].identity, 1) // 1st user
    assert.equal(grouped[1].value.id, 2) // 2nd profile
    assert.equal(grouped[1].value.user_id, 1) // 1st user id
  })

  test('use 2nd instance of related instance when grouping rows', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').insert([{ username: 'virk' }, { username: 'nikk' }]).into('users')
    const users = await User.all()

    /**
     * Fake profile 1 for 2nd user
     */
    const fakeProfile1 = new Profile()
    fakeProfile1.id = 1
    fakeProfile1.user_id = users.rows[1].id

    /**
     * Fake profile 2 but for first user
     */
    const fakeProfile2 = new Profile()
    fakeProfile2.id = 2
    fakeProfile2.user_id = users.rows[0].id

    /**
     * Fake profile 3 for 1st user. Now since hasOne can be
     * only one relation, the latest one will be used
     */
    const fakeProfile3 = new Profile()
    fakeProfile3.id = 3
    fakeProfile3.user_id = users.rows[0].id

    const { values: grouped } = users.first().profile().group([fakeProfile1, fakeProfile2, fakeProfile3])
    assert.lengthOf(grouped, 2)
    assert.equal(grouped[0].identity, 2) // 2nd user
    assert.equal(grouped[0].value.id, 1) // 1st profile
    assert.equal(grouped[0].value.user_id, 2) // 2nd user id

    assert.equal(grouped[1].identity, 1) // 1st user
    assert.equal(grouped[1].value.id, 3) // 3rd profile, since 2nd is overridden due to duplicacy
    assert.equal(grouped[1].value.user_id, 1) // 1st user id
  })

  test('eagerload via query builder', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const user = await ioc.use('Database').table('users').insert({ username: 'virk' }).returning('id')
    await ioc.use('Database').table('profiles').insert({ user_id: user[0], profile_name: 'virk', likes: 3 })

    const result = await User.query().with('profile').fetch()
    assert.instanceOf(result.first().getRelated('profile'), Profile)
  })

  test('eagerload for multiple parent records via query builder', async (assert) => {
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

    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([
      { user_id: 1, profile_name: 'virk', likes: 3 },
      { user_id: 2, profile_name: 'nikk', likes: 2 }
    ])

    const result = await User.query().with('profile').fetch()
    assert.equal(result.size(), 2)
    assert.instanceOf(result.rows[0].getRelated('profile'), Profile)
    assert.instanceOf(result.rows[1].getRelated('profile'), Profile)
    assert.equal(result.rows[0].getRelated('profile').profile_name, 'virk')
    assert.equal(result.rows[1].getRelated('profile').profile_name, 'nikk')
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" in (?, ?)'))
  })

  test('modify query builder when fetching relationships', async (assert) => {
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
    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([
      { user_id: 1, profile_name: 'virk', likes: 3 },
      { user_id: 2, profile_name: 'nikk', likes: 2 }
    ])

    const result = await User.query().with('profile', (builder) => {
      builder.where('likes', '>', 2)
    }).fetch()
    assert.equal(result.size(), 2)
    assert.instanceOf(result.rows[0].getRelated('profile'), Profile)
    assert.isNull(result.rows[1].getRelated('profile'))
    assert.equal(result.rows[0].getRelated('profile').profile_name, 'virk')
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "likes" > ? and "user_id" in (?, ?)'))
  })

  test('fetch nested relationships', async (assert) => {
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

    let profileQuery = null
    let pictureQuery = null
    Profile.onQuery((query) => (profileQuery = query))
    Picture.onQuery((query) => (pictureQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })
    await ioc.use('Database').table('pictures').insert({ profile_id: 1, storage_path: '/foo' })

    const user = await User.query().with('profile.picture').fetch()
    assert.instanceOf(user.first().getRelated('profile').getRelated('picture'), Picture)
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" in (?)'))
    assert.equal(pictureQuery.sql, helpers.formatQuery('select * from "pictures" where "profile_id" in (?)'))
  })

  test('add runtime constraints on nested relationships', async (assert) => {
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

    let profileQuery = null
    let pictureQuery = null
    Profile.onQuery((query) => (profileQuery = query))
    Picture.onQuery((query) => (pictureQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })
    await ioc.use('Database').table('pictures').insert({ profile_id: 1, storage_path: '/foo' })

    const user = await User.query().with('profile.picture', (builder) => {
      builder.where('storage_path', '/bar')
    }).fetch()
    assert.isNull(user.first().getRelated('profile').getRelated('picture'))
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "user_id" in (?)'))
    assert.equal(pictureQuery.sql, helpers.formatQuery('select * from "pictures" where "storage_path" = ? and "profile_id" in (?)'))
  })

  test('add runtime constraints on child relationships and not grandchild', async (assert) => {
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

    let profileQuery = null
    let pictureQuery = null
    Profile.onQuery((query) => (profileQuery = query))
    Picture.onQuery((query) => (pictureQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })
    await ioc.use('Database').table('pictures').insert({ profile_id: 1, storage_path: '/foo' })

    const user = await User.query().with('profile', (builder) => {
      builder.where('likes', '>', 3).with('picture')
    }).fetch()
    assert.isNull(user.first().getRelated('profile'))
    assert.equal(profileQuery.sql, helpers.formatQuery('select * from "profiles" where "likes" > ? and "user_id" in (?)'))
    assert.isNull(pictureQuery)
  })

  test('limit parent records based on child', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const users = await User.query().has('profile').fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where users.id = profiles.user_id)'))
  })

  test('limit parent records based on nested childs', async (assert) => {
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

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })
    await ioc.use('Database').table('pictures').insert({ profile_id: 1, storage_path: 'foo' })

    const users = await User.query().has('profile.picture').fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where exists (select * from "pictures" where profiles.id = pictures.profile_id) and users.id = profiles.user_id)'))
  })

  test('return null when nested child query fails', async (assert) => {
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

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const users = await User.query().has('profile.picture').fetch()
    assert.equal(users.size(), 0)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where exists (select * from "pictures" where profiles.id = pictures.profile_id) and users.id = profiles.user_id)'))
  })

  test('throw exception when has receives an invalid relationship', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const fn = () => User.query().has('foo')
    assert.throw(fn, 'E_INVALID_MODEL_RELATION: foo is not defined on User model')
  })

  test('add expression and value to has method', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const users = await User.query().has('profile', '>', 1).fetch()
    assert.equal(users.size(), 0)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "profiles" where users.id = profiles.user_id) > ?'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([1]))
  })

  test('add expression and value to nested relation using has method', async (assert) => {
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

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const users = await User.query().has('profile.picture', '>', 1).fetch()
    assert.equal(users.size(), 0)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where (select count(*) from "pictures" where profiles.id = pictures.profile_id) > ? and users.id = profiles.user_id)'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([1]))
  })

  test('add expression and value to nested relation using has method', async (assert) => {
    class Identity extends Model {
    }

    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }

      identity () {
        return this.hasOne(Identity)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Identity._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('identities').insert({ user_id: 1 })

    const users = await User.query().has('profile').orHas('identity').fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where users.id = profiles.user_id) or exists (select * from "identities" where users.id = identities.user_id)'))
  })

  test('apply has via query scope', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }

      static scopeHasProfile (query) {
        return query.has('profile')
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1 })

    const users = await User.query().hasProfile().fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where users.id = profiles.user_id)'))
  })

  test('add more constraints to has via whereHas', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }, { user_id: 2, likes: 2 }])

    const users = await User.query().whereHas('profile', function (builder) {
      builder.where('likes', '>', 2)
    }).fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where "likes" > ? and users.id = profiles.user_id)'))
  })

  test('add count constraints via whereHas', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }, { user_id: 2, likes: 2 }])

    const users = await User.query().whereHas('profile', function (builder) {
      builder.where('likes', '>', 2)
    }, '=', 1).fetch()
    assert.equal(users.size(), 1)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "profiles" where "likes" > ? and users.id = profiles.user_id) = ?'))
  })

  test('add whereDoesHave constraint', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }, { user_id: 2, likes: 2 }])

    const users = await User.query().whereDoesntHave('profile', function (builder) {
      builder.where('likes', '>', 2)
    }).fetch()
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'nikk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where not exists (select * from "profiles" where "likes" > ? and users.id = profiles.user_id)'))
  })

  test('add orWhereHas constraint', async (assert) => {
    class Identity extends Model {
    }

    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }

      identity () {
        return this.hasOne(Identity)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Identity._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }, { user_id: 2, likes: 2 }])
    await ioc.use('Database').table('identities').insert([{ user_id: 1, is_active: false }, { user_id: 2, is_active: true }])

    const users = await User.query().whereHas('profile', function (builder) {
      builder.where('likes', '>', 2)
    }).orWhereHas('identity', function (builder) {
      builder.where('is_active', true)
    }).fetch()
    assert.equal(users.size(), 2)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where "likes" > ? and users.id = profiles.user_id) or exists (select * from "identities" where "is_active" = ? and users.id = identities.user_id)'))
  })

  test('add orWhereDoesntHave constraint', async (assert) => {
    class Identity extends Model {
    }

    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }

      identity () {
        return this.hasOne(Identity)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()
    Identity._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }, { user_id: 2, likes: 2 }])
    await ioc.use('Database').table('identities').insert([{ user_id: 1, is_active: false }, { user_id: 2, is_active: true }])

    const users = await User.query().whereHas('profile', function (builder) {
      builder.where('likes', '>', 2)
    }).orWhereDoesntHave('identity', function (builder) {
      builder.where('is_active', true)
    }).fetch()
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'virk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "profiles" where "likes" > ? and users.id = profiles.user_id) or not exists (select * from "identities" where "is_active" = ? and users.id = identities.user_id)'))
  })

  test('eagerload and paginate via query builder', async (assert) => {
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
    await ioc.use('Database').table('profiles').insert([
      { user_id: 1, profile_name: 'virk', likes: 3 },
      { user_id: 2, profile_name: 'nikk', likes: 2 }
    ])

    const users = await User.query().with('profile').paginate(1, 1)
    assert.instanceOf(users, CollectionSerializer)
    assert.equal(users.size(), 1)
    assert.instanceOf(users.first().getRelated('profile'), Profile)
    assert.equal(users.first().getRelated('profile').profile_name, 'virk')
  })

  test('paginate with has constraints', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = await User.query().has('profile', '=', 1).paginate(1)
    assert.equal(users.size(), 1)
    assert.deepEqual(users.pages, { lastPage: 1, perPage: 20, total: helpers.formatNumber(1), page: 1 })
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where (select count(*) from "profiles" where users.id = profiles.user_id) = ? limit ?'))
  })

  test('return relation count', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = await User.query().withCount('profile').fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.first().profile_count, 1)
    assert.deepEqual(users.first().$sideLoaded, { profile_count: helpers.formatNumber(1) })
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "profiles" where users.id = profiles.user_id) as "profile_count" from "users"'))
  })

  test('return relation count with paginate method', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = await User.query().withCount('profile').paginate()
    assert.equal(users.size(), 2)
    assert.equal(users.first().profile_count, 1)
    assert.deepEqual(users.first().$sideLoaded, { profile_count: helpers.formatNumber(1) })
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "profiles" where users.id = profiles.user_id) as "profile_count" from "users" limit ?'))
  })

  test('define count column for withCount', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = await User.query().withCount('profile as my_profile').fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.first().my_profile, 1)
    assert.deepEqual(users.first().$sideLoaded, { my_profile: helpers.formatNumber(1) })
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "profiles" where users.id = profiles.user_id) as "my_profile" from "users"'))
  })

  test('define callback with withCount', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = await User.query().withCount('profile', function (builder) {
      builder.where('likes', '>', 3)
    }).fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.first().profile_count, 0)
    assert.deepEqual(users.first().$sideLoaded, { profile_count: helpers.formatNumber(0) })
    assert.equal(userQuery.sql, helpers.formatQuery('select *, (select count(*) from "profiles" where "likes" > ? and users.id = profiles.user_id) as "profile_count" from "users"'))
  })

  test('throw exception when trying to call withCount with nested relations', async (assert) => {
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
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = () => User.query().withCount('profile.picture')
    assert.throw(users, `E_CANNOT_NEST_RELATION: withCount does not allowed nested relations. Instead use .with('profile', (builder) => builder.withCount('picture'))`)
  })

  test('allow withCount on nested query builder', async (assert) => {
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

    let userQuery = null
    let profileQuery = null
    User.onQuery((query) => (userQuery = query))
    Profile.onQuery((query) => (profileQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])
    await ioc.use('Database').table('pictures').insert([{ profile_id: 1, storage_path: '/foo' }])

    const users = await User.query().with('profile', (builder) => builder.withCount('picture')).fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.first().getRelated('profile').picture_count, helpers.formatNumber(1))
    assert.deepEqual(users.first().getRelated('profile').$sideLoaded, { picture_count: helpers.formatNumber(1) })
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users"'))
    assert.equal(profileQuery.sql, helpers.formatQuery('select *, (select count(*) from "pictures" where profiles.id = pictures.profile_id) as "picture_count" from "profiles" where "user_id" in (?, ?)'))
  })

  test('eagerload when calling first', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const user = await User.query().with('profile').first()
    assert.instanceOf(user.getRelated('profile'), Profile)
  })

  test('set model parent when fetched as a relation', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const user = await User.query().with('profile').first()
    assert.equal(user.getRelated('profile').$parent, 'User')
    assert.isTrue(user.getRelated('profile').hasParent)
  })

  test('set model parent when fetched via query builder fetch method', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

    const user = await User.query().with('profile').fetch()
    assert.equal(user.first().getRelated('profile').$parent, 'User')
    assert.isTrue(user.first().getRelated('profile').hasParent)
  })

  test('withCount should respect existing selected columns', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([{ user_id: 1, likes: 3 }])

    const users = await User.query().select('username').withCount('profile').fetch()
    assert.equal(users.size(), 2)
    assert.equal(users.first().profile_count, 1)
    assert.deepEqual(users.first().$sideLoaded, { profile_count: helpers.formatNumber(1) })
    assert.equal(userQuery.sql, helpers.formatQuery('select "username", (select count(*) from "profiles" where users.id = profiles.user_id) as "profile_count" from "users"'))
  })

  test('orHas should work fine', async (assert) => {
    class Car extends Model {
    }

    class Profile extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }

      profile () {
        return this.hasOne(Profile)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })
    await ioc.use('Database').table('cars').insert({ user_id: 2, name: 'audi', model: '2001' })

    const users = await User.query().has('cars').orHas('profile').fetch()
    assert.equal(users.size(), 2)
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where exists (select * from "cars" where users.id = cars.user_id) or exists (select * from "profiles" where users.id = profiles.user_id)'))
  })

  test('doesntHave should work fine', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Profile)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk' })

    const users = await User.query().doesntHave('profile').fetch()
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'nikk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where not exists (select * from "profiles" where users.id = profiles.user_id)'))
  })

  test('orDoesntHave should work fine', async (assert) => {
    class Car extends Model {
    }

    class Profile extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }

      profile () {
        return this.hasOne(Profile)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
    await ioc.use('Database').table('profiles').insert([
      { user_id: 1, profile_name: 'virk' },
      { user_id: 2, profile_name: 'nikk' }
    ])
    await ioc.use('Database').table('cars').insert({ user_id: 2, name: 'audi', model: '2001' })

    const users = await User.query().doesntHave('profile').orDoesntHave('cars').paginate()
    assert.equal(users.size(), 1)
    assert.equal(users.first().username, 'virk')
    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where not exists (select * from "profiles" where users.id = profiles.user_id) or not exists (select * from "cars" where users.id = cars.user_id) limit ?'))
  })

  test('throw exception when trying to eagerload relation twice', async (assert) => {
    assert.plan(3)

    class Car extends Model {
    }

    class User extends Model {
      cars () {
        return this.hasMany(Car)
      }
    }

    Car._bootIfNotBooted()
    User._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert({ user_id: 1, name: 'audi', model: '2001' })

    const user = await User.query().with('cars').first()
    assert.instanceOf(user.getRelated('cars'), CollectionSerializer)
    assert.equal(user.getRelated('cars').size(), 1)

    try {
      await user.load('cars')
    } catch ({ message }) {
      assert.equal(message, 'E_CANNOT_OVERRIDE_RELATION: Trying to eagerload cars relationship twice')
    }
  })
})

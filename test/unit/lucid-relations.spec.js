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
    await ioc.use('Adonis/Src/Database').table('pictures').truncate()
    await ioc.use('Adonis/Src/Database').table('identities').truncate()
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

    let profileQuery = null

    Profile.onQuery((query) => profileQuery = query)

    const user = await ioc.use('Database').table('users').insert({ username: 'virk' })
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

    Profile.onQuery((query) => profileQuery = query)

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
    Profile.onQuery((query) => profileQuery = query)

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
    Profile.onQuery((query) => profileQuery = query)
    Picture.onQuery((query) => pictureQuery = query)

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
    Profile.onQuery((query) => profileQuery = query)
    Picture.onQuery((query) => pictureQuery = query)

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
    Profile.onQuery((query) => profileQuery = query)
    Picture.onQuery((query) => pictureQuery = query)

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

  // test('limit parent records based on child', async (assert) => {
  //   class Profile extends Model {
  //   }

  //   class User extends Model {
  //     profile () {
  //       return this.hasOne(Profile)
  //     }
  //   }

  //   User._bootIfNotBooted()
  //   Profile._bootIfNotBooted()

  //   let profileQuery = null
  //   Profile.onQuery((query) => profileQuery = query)

  //   await ioc.use('Database').table('users').insert([{ username: 'virk' }, { username: 'nikk' }])
  //   await ioc.use('Database').table('profiles').insert({ user_id: 1, profile_name: 'virk', likes: 3 })

  //   const users = await User.query().whereHas('profile').fetch()
  //   assert.equal(users.size(), 1)
  // })
})

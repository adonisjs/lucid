'use strict'

/*
 * adonis-lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

require('../../lib/iocResolver').setFold(require('@adonisjs/fold'))
const test = require('japa')
const fs = require('fs-extra')
const path = require('path')
const { ioc } = require('@adonisjs/fold')
const { Config } = require('@adonisjs/sink')

const helpers = require('./helpers')
const Model = require('../../src/Lucid/Model')
const DatabaseManager = require('../../src/Database/Manager')
const VanillaSerializer = require('../../src/Lucid/Serializers/Vanilla')

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
    ioc.restore()
    await ioc.use('Adonis/Src/Database').table('users').truncate()
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
    assert.instanceOf(profiles, VanillaSerializer)
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
    assert.instanceOf(profiles, VanillaSerializer)
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

  test('associate related instance', async (assert) => {
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

    const profile = new Profile()
    profile.profile_name = 'virk'
    await profile.save()

    const user = new User()
    user.username = 'virk'
    await user.save()

    await profile.user().associate(user)
    assert.equal(profile.user_id, 1)
    assert.isFalse(profile.isNew)

    const freshProfile = await ioc.use('Database').table('profiles').first()
    assert.equal(freshProfile.id, 1)
    assert.equal(freshProfile.user_id, 1)
    assert.equal(profileQuery.sql, helpers.formatQuery('update "profiles" set "updated_at" = ?, "user_id" = ? where "id" = ?'))
  })

  test('persist parent record if not already persisted', async (assert) => {
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

    const profile = new Profile()
    profile.profile_name = 'virk'

    const user = new User()
    user.username = 'virk'
    await user.save()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await profile.user().associate(user)
    assert.equal(profile.user_id, 1)
    assert.isFalse(profile.isNew)

    const freshProfile = await ioc.use('Database').table('profiles').first()
    assert.equal(freshProfile.id, 1)
    assert.equal(freshProfile.user_id, 1)
    assert.equal(profileQuery.sql, helpers.formatQuery(helpers.addReturningStatement('insert into "profiles" ("created_at", "profile_name", "updated_at", "user_id") values (?, ?, ?, ?)', 'id')))
    assert.isNull(userQuery)
  })

  test('persist related instance if not already persisted', async (assert) => {
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

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    const profile = new Profile()
    profile.profile_name = 'virk'

    const user = new User()
    user.username = 'virk'

    await profile.user().associate(user)
    assert.equal(profile.user_id, 1)
    assert.isFalse(profile.isNew)
    assert.isFalse(user.isNew)

    const freshProfile = await ioc.use('Database').table('profiles').first()
    assert.equal(freshProfile.id, 1)
    assert.equal(freshProfile.user_id, 1)

    const freshUser = await ioc.use('Database').table('users').first()
    assert.equal(freshUser.id, 1)
    assert.equal(profileQuery.sql, helpers.formatQuery(helpers.addReturningStatement('insert into "profiles" ("created_at", "profile_name", "updated_at", "user_id") values (?, ?, ?, ?)', 'id')))
    assert.equal(userQuery.sql, helpers.formatQuery(helpers.addReturningStatement('insert into "users" ("created_at", "updated_at", "username") values (?, ?, ?)', 'id')))
  })

  test('dissociate existing relationship', async (assert) => {
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

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('profiles').insert({ profile_name: 'virk', user_id: 1 })

    const profile = await Profile.find(1)
    assert.equal(profile.user_id, 1)

    await profile.user().dissociate()
    assert.equal(profile.user_id, null)
    assert.isFalse(profile.isNew)

    const freshProfile = await ioc.use('Database').table('profiles').first()
    assert.equal(freshProfile.id, 1)
    assert.equal(freshProfile.user_id, null)

    assert.equal(profileQuery.sql, helpers.formatQuery('update "profiles" set "updated_at" = ?, "user_id" = ? where "id" = ?'))
    assert.isNull(profileQuery.bindings[1])
  })

  test('throw exception when trying to dissociate fresh models', async (assert) => {
    assert.plan(1)
    class User extends Model {
    }

    class Profile extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Profile._bootIfNotBooted()

    const profile = new Profile()
    try {
      await profile.user().dissociate()
    } catch ({ message }) {
      assert.equal(message, 'E_UNSAVED_MODEL_INSTANCE: Cannot dissociate relationship since model instance is not persisted')
    }
  })

  test('delete related rows', async (assert) => {
    assert.plan(1)
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
    await ioc.use('Database').table('profiles').insert({ profile_name: 'virk', user_id: 1 })

    const profile = await Profile.find(1)
    await profile.user().delete()
    assert.equal(userQuery.sql, helpers.formatQuery('delete from "users" where "id" = ?'))
  })

  test('belongsTo relation work fine with IoC container binding', async (assert) => {
    class User extends Model {
    }

    ioc.fake('App/Models/User', () => {
      return User
    })

    class Profile extends Model {
      user () {
        return this.belongsTo('App/Models/User')
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

  test('load relation without null value in foreign key', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    let userQuery = null
    User.onQuery((query) => (userQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })
    await ioc.use('Database').table('cars').insert({ name: 'GL350', model: 'Mercedes', user_id: 1 })

    await Car.query().with('user').fetch()

    assert.equal(userQuery.sql, helpers.formatQuery('select * from "users" where "id" in (?)'))
    assert.deepEqual(userQuery.bindings, helpers.formatBindings([1]))
  })

  test('do not load relation with null value in foreign key', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    let userQuery = null
    let carQuery = null
    User.onQuery((query) => (userQuery = query))
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })

    const car = await Car.query().select(['id', 'name', 'user_id']).where('id', 1).first()
    await car.load('user')
    const json = car.toJSON()

    assert.deepEqual(json, {
      id: 1,
      name: 'E180',
      user: null,
      user_id: null
    })

    assert.equal(userQuery, null)
    assert.equal(carQuery.sql, helpers.formatQuery('select "id", "name", "user_id" from "cars" where "id" = ? limit ?'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1, 1]))
  })

  test('do not eager load relation with null value in foreign key', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    let userQuery = null
    let carQuery = null
    User.onQuery((query) => (userQuery = query))
    Car.onQuery((query) => (carQuery = query))

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })

    const car = await Car
      .query()
      .select(['id', 'name', 'user_id'])
      .where('id', 1)
      .with('user')
      .first()

    const json = car.toJSON()

    assert.deepEqual(json, {
      id: 1,
      name: 'E180',
      user: null,
      user_id: null
    })

    assert.equal(userQuery, null)
    assert.equal(carQuery.sql, helpers.formatQuery('select "id", "name", "user_id" from "cars" where "id" = ? limit ?'))
    assert.deepEqual(carQuery.bindings, helpers.formatBindings([1, 1]))
  })

  test('throw exception when not eagerloading', async (assert) => {
    class User extends Model {
    }

    class Car extends Model {
      user () {
        return this.belongsTo(User)
      }
    }

    User._bootIfNotBooted()
    Car._bootIfNotBooted()

    await ioc.use('Database').table('users').insert({ username: 'virk' })
    await ioc.use('Database').table('cars').insert({ name: 'E180', model: 'Mercedes', user_id: null })

    const car = await Car.query().where('id', 1).first()
    const fn = () => car.user().toSQL()
    assert.throw(fn, 'E_UNSAVED_MODEL_INSTANCE: Cannot process relation, since Car model is not persisted to database or relational value is undefined')
  })
})

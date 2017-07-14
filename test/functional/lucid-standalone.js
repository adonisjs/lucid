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

const helpers = require('../unit/helpers')

const { db, Models, Model } = require('../../')({
  connection: 'testing',
  testing: helpers.getConfig()
})

test.group('Database', (group) => {
  group.before(async () => {
    await fs.ensureDir(path.join(__dirname, '../unit/tmp'))
    await helpers.createTables(db)
  })

  group.beforeEach(() => {
    Models.clear()
  })

  group.afterEach(async () => {
    await db.table('users').truncate()
    await db.table('profiles').truncate()
  })

  group.after(async () => {
    await helpers.dropTables(db)
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('should be able to make queries via database provider', async (assert) => {
    const users = await db.table('users')
    assert.deepEqual(users, [])
  })

  test('should be able to define models', async (assert) => {
    class User extends Model {
    }
    Models.add('User', User)
    const users = await Models.get('User').all()
    assert.deepEqual(users.rows, [])
  })

  test('should be able to define relations', async (assert) => {
    class Profile extends Model {
    }

    class User extends Model {
      profile () {
        return this.hasOne(Models.get('Profile'))
      }
    }

    Models.add('Profile', Profile)
    Models.add('User', User)

    await db.table('users').insert({ username: 'virk' })
    await db.table('profiles').insert({ profile_name: 'virk', user_id: 1 })

    const user = await Models.get('User').find(1)
    assert.instanceOf(user, User)
    assert.equal(user.id, 1)

    const profile = await user.profile().fetch()
    assert.instanceOf(profile, Profile)
    assert.equal(profile.user_id, 1)
  })

  test('define hooks', async (assert) => {
    const stack = []

    class User extends Model {
      profile () {
        return this.hasOne(Models.get('Profile'))
      }

      static boot () {
        super.boot()
        this.addHook('beforeCreate', async () => {
          stack.push('beforeCreate called')
        })
      }
    }

    Models.add('User', User)
    const user = new (Models.get('User'))()
    user.username = 'virk'
    await user.save()
    assert.deepEqual(stack, ['beforeCreate called'])
  })
})

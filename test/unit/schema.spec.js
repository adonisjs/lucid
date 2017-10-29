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
const path = require('path')
const fs = require('fs-extra')
const { ioc } = require('@adonisjs/fold')
const { Config, setupResolver } = require('@adonisjs/sink')
const Schema = require('../../src/Schema')
const helpers = require('./helpers')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Schema', (group) => {
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
    await helpers.createTables(ioc.use('Database'))
    setupResolver()
  })

  group.afterEach(async () => {
    await ioc.use('Database').schema.dropTableIfExists('schema_users')
    await ioc.use('Database').schema.dropTableIfExists('schema_profiles')
  })

  group.after(async () => {
    await helpers.dropTables(ioc.use('Database'))
    ioc.use('Database').close()
    try {
      await fs.remove(path.join(__dirname, './tmp'))
    } catch (error) {
      if (process.platform !== 'win32' || error.code !== 'EBUSY') {
        throw error
      }
    }
  }).timeout(0)

  test('run schema methods using schema instance', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.createTable('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'createTable', args: ['users', fn] }])
  })

  test('add deferred action for createTableIfNotExists', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.createIfNotExists('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'createTableIfNotExists', args: ['users', fn] }])
  })

  test('add deferred action for renameTable', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.renameTable('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'renameTable', args: ['users', fn] }])
  })

  test('add deferred action for table', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.alter('users', fn)
    assert.deepEqual(userSchema._deferredActions, [{ name: 'table', args: ['users', fn] }])
  })

  test('add deferred action for dropTableIfExists', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.dropIfExists('users')
    assert.deepEqual(userSchema._deferredActions, [{ name: 'dropTableIfExists', args: ['users'] }])
  })

  test('add deferred action for rename table', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.rename('users', 'my_users')
    assert.deepEqual(userSchema._deferredActions, [{ name: 'renameTable', args: ['users', 'my_users'] }])
  })

  if (process.env.DB === 'pg') {
    test('add deferred action for createExtension', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.createExtension('postgis')
      assert.deepEqual(userSchema._deferredActions, [{ name: 'createExtension', args: ['postgis'] }])
    })

    test('add deferred action for createExtensionIfNotExists', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.createExtensionIfNotExists('postgis')
      assert.deepEqual(userSchema._deferredActions, [{ name: 'createExtensionIfNotExists', args: ['postgis'] }])
    })

    test('add deferred action for dropExtension', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.dropExtension('postgis')
      assert.deepEqual(userSchema._deferredActions, [{ name: 'dropExtension', args: ['postgis'] }])
    })

    test('add deferred action for dropExtensionIfExists', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.dropExtensionIfExists('postgis')
      assert.deepEqual(userSchema._deferredActions, [{ name: 'dropExtensionIfExists', args: ['postgis'] }])
    })
  }

  test('should have access to knex fn', async (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    assert.isDefined(userSchema.fn.now)
  })

  test('execute schema actions in sequence', async (assert) => {
    class UserSchema extends Schema {
      up () {
        this.createTable('schema_users', (table) => {
          table.increments()
        })

        this.createTable('schema_profile', (table) => {
          table.increments()
        })
      }
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.up()
    await userSchema.executeActions()
    const hasUsers = await userSchema.hasTable('schema_users')
    const hasProfile = await userSchema.hasTable('schema_profile')
    assert.isTrue(hasUsers)
    assert.isTrue(hasProfile)
    await ioc.use('Database').schema.dropTable('schema_users')
    await ioc.use('Database').schema.dropTable('schema_profile')
  })

  test('rollback schema actions on exception', async (assert) => {
    class UserSchema extends Schema {
      up () {
        this.createTable('schema_users', (table) => {
          table.increments()
        })

        this.createTable('users', (table) => {
          table.increments()
        })
      }
    }

    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.up()
    try {
      await userSchema.executeActions()
      assert.isFalse(true)
    } catch ({ message }) {
      assert.include(message, helpers.formatQuery('already exists'))
      if (process.env.DB !== 'mysql') {
        const hasSchemaUsers = await ioc.use('Database').schema.hasTable('schema_users')
        assert.isFalse(hasSchemaUsers)
      }
    }
  })

  test('get actions sql over executing them', async (assert) => {
    class UserSchema extends Schema {
      up () {
        this.createTable('schema_users', (table) => {
          table.increments()
        })

        this.createTable('users', (table) => {
          table.increments()
        })
      }
    }

    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.up()
    const queries = await userSchema.executeActions(true)
    assert.lengthOf(queries, 2)
    const hasSchemaUsers = await ioc.use('Database').schema.hasTable('schema_users')
    assert.isFalse(hasSchemaUsers)
  })
})

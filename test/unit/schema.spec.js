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

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'createTable', args: ['users', fn] }])
  })

  test('add deferred action for createTableIfNotExists', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.createIfNotExists('users', fn)

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'createTableIfNotExists', args: ['users', fn] }])
  })

  test('add deferred action for renameTable', (assert) => {
    class UserSchema extends Schema {
    }

    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}

    userSchema.renameTable('users', fn)

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'renameTable', args: ['users', fn] }])
  })

  test('add deferred action for table', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = function () {}
    userSchema.alter('users', fn)

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'table', args: ['users', fn] }])
  })

  test('add deferred action for dropTableIfExists', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.dropIfExists('users')

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'dropTableIfExists', args: ['users'] }])
  })

  test('add deferred action for rename table', (assert) => {
    class UserSchema extends Schema {
    }
    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.rename('users', 'my_users')

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'renameTable', args: ['users', 'my_users'] }])
  })

  if (process.env.DB === 'pg') {
    test('add deferred action for createExtension', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.createExtension('postgis')

      assert.lengthOf(userSchema._chains, 1)
      assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'createExtension', args: ['postgis'] }])
    })

    test('add deferred action for createExtensionIfNotExists', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.createExtensionIfNotExists('postgis')

      assert.lengthOf(userSchema._chains, 1)
      assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'createExtensionIfNotExists', args: ['postgis'] }])
    })

    test('add deferred action for dropExtension', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.dropExtension('postgis')

      assert.lengthOf(userSchema._chains, 1)
      assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'dropExtension', args: ['postgis'] }])
    })

    test('add deferred action for dropExtensionIfExists', (assert) => {
      class UserSchema extends Schema {
      }
      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.dropExtensionIfExists('postgis')

      assert.lengthOf(userSchema._chains, 1)
      assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'dropExtensionIfExists', args: ['postgis'] }])
    })

    test('should be able to chain withSchema', (assert) => {
      const fn = function () {}

      class UserSchema extends Schema {
        up () {
          this
            .withSchema('public')
            .table('users', fn)
        }
      }

      const userSchema = new UserSchema(ioc.use('Database'))
      userSchema.up()

      assert.lengthOf(userSchema._chains, 1)
      assert.deepEqual(userSchema._chains[0]._deferredActions, [
        {
          name: 'withSchema', args: ['public']
        },
        {
          name: 'table', args: ['users', fn]
        }
      ])
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

  test('calling this.raw should not cause infinite loop lucid#212', async (assert) => {
    class UserSchema extends Schema {
      up () {
        this
          .raw('CREATE table schema_users (id int);')
          .table('schema_users', (table) => {
            table.string('username')
          })
      }
    }

    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.up()

    await userSchema.executeActions()
    const hasSchemaUsers = await ioc.use('Database').schema.hasColumn('schema_users', 'id')

    assert.isTrue(hasSchemaUsers)
  })

  test('add deferred action for raw', (assert) => {
    class UserSchema extends Schema {
    }

    const userSchema = new UserSchema(ioc.use('Database'))
    userSchema.raw('CREATE table schema_users (id int);')

    assert.lengthOf(userSchema._chains, 1)
    assert.deepEqual(userSchema._chains[0]._deferredActions, [{ name: 'raw', args: ['CREATE table schema_users (id int);'] }])
  })

  test('schedule a function to be called in sequence with schema statements', async (assert) => {
    let users = null

    class UserSchema extends Schema {
      up () {
        this.createTable('schema_users', (table) => {
          table.increments()
        })

        this.schedule(async (trx) => {
          users = await ioc.use('Database').transacting(trx).table('schema_users')
        })
      }
    }

    const userSchema = new UserSchema(ioc.use('Database'))

    userSchema.up()
    await userSchema.executeActions()

    assert.deepEqual(users, [])
  })

  test('throw exception when function is not passed to schedule method', async (assert) => {
    class UserSchema extends Schema {
      up () {
        this.createTable('schema_users', (table) => {
          table.increments()
        })
        this.schedule()
      }
    }

    const userSchema = new UserSchema(ioc.use('Database'))
    const fn = () => userSchema.up()
    assert.throw(fn, 'E_INVALID_PARAMETER: this.schedule expects 1st argument to be a function')
  })
})

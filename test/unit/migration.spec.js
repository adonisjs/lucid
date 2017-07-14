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
const Migration = require('../../src/Migration')
const Schema = require('../../src/Schema')
const helpers = require('./helpers')
const DatabaseManager = require('../../src/Database/Manager')

test.group('Migration', (group) => {
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
    await ioc.use('Database').schema.dropTableIfExists('adonis_schema')
    await ioc.use('Database').schema.dropTableIfExists('adonis_schema_lock')
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

  test('create migration table', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    const hasTable = await ioc.use('Database').schema.hasTable('adonis_schema')
    assert.isTrue(hasTable)
  })

  test('create migration lock table', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeLockTable()
    const hasTable = await ioc.use('Database').schema.hasTable('adonis_schema_lock')
    assert.isTrue(hasTable)
  })

  test('add lock to lock table', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await migration._makeLockTable()
    await migration._addLock()
    const lock = await ioc.use('Database').table('adonis_schema_lock')
    assert.deepEqual(lock, [{ id: 1, is_locked: helpers.formatBoolean(true) }])
  })

  test('remove lock', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await migration._makeLockTable()
    await migration._addLock()
    const lock = await ioc.use('Database').table('adonis_schema_lock')
    assert.deepEqual(lock, [{ id: 1, is_locked: helpers.formatBoolean(true) }])
    await migration._removeLock()
    const hasTable = await ioc.use('Database').schema.hasTable('adonis_schema_lock')
    assert.isFalse(hasTable)
  })

  test('get last schema batch as 0 when there is no batch', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    const batch = await migration._getLatestBatch()
    assert.equal(batch, 0)
  })

  test('get the max batch number when there is an existing batch', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await ioc.use('Database').table('adonis_schema').insert([
      {
        batch: 1,
        name: 'foo'
      },
      {
        batch: 2,
        name: 'bar'
      }
    ])
    const batch = await migration._getLatestBatch()
    assert.equal(batch, 2)
  })

  test('add new row for a given batch', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await migration._addForBatch('foo', 1)
    const migrations = await ioc.use('Database').table('adonis_schema')
    assert.equal(migrations[0].name, 'foo')
    assert.equal(migrations[0].batch, 1)
  })

  test('remove a given row', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()

    await migration._addForBatch('foo', 1)
    let migrations = await ioc.use('Database').table('adonis_schema')
    assert.equal(migrations[0].name, 'foo')
    assert.equal(migrations[0].batch, 1)

    await migration._remove('foo')
    migrations = await ioc.use('Database').table('adonis_schema')
    assert.lengthOf(migrations, 0)
  })

  test('get all rows till a batch in reverse order', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await ioc.use('Database').table('adonis_schema').insert([
      {
        batch: 1,
        name: 'foo'
      },
      {
        batch: 2,
        name: 'bar'
      },
      {
        batch: 3,
        name: 'joe'
      },
      {
        batch: 3,
        name: 'baz'
      }
    ])

    const rows = await migration._getAfterBatch(2)
    assert.lengthOf(rows, 2)
    assert.deepEqual(rows, ['baz', 'joe'])
  })

  test('get all the rows when batch is zero', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await ioc.use('Database').table('adonis_schema').insert([
      {
        batch: 1,
        name: 'foo'
      },
      {
        batch: 2,
        name: 'bar'
      },
      {
        batch: 3,
        name: 'joe'
      },
      {
        batch: 3,
        name: 'baz'
      }
    ])

    const rows = await migration._getAfterBatch(0)
    assert.lengthOf(rows, 4)
    assert.deepEqual(rows, ['bar', 'baz', 'foo', 'joe'])
  })

  test('get diff of schemas to be executes', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    const diff = await migration._getDiff(['2017-30-20', '2017-30-19'])
    assert.deepEqual(diff, ['2017-30-20', '2017-30-19'])
  })

  test('get diff of schema not executed yet', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await ioc.use('Database').table('adonis_schema').insert([
      {
        batch: 1,
        name: '2017-30-20'
      }
    ])
    const diff = await migration._getDiff(['2017-30-20', '2017-30-19'])
    assert.deepEqual(diff, ['2017-30-19'])
  })

  test('get diff for rollback', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    await migration._makeMigrationsTable()
    await ioc.use('Database').table('adonis_schema').insert([
      {
        batch: 1,
        name: '2017-30-20'
      },
      {
        batch: 1,
        name: '2017-30-22'
      }
    ])
    const diff = await migration._getDiff(['2017-30-19', '2017-30-20', '2017-30-22'], 'down')
    assert.deepEqual(diff, ['2017-30-22', '2017-30-20'])
  })

  test('execute schema classes', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })
      }
    }

    await migration.up({ '2017-07-20': UserSchema })
    const info = await migration.db.table('schema_users').columnInfo()
    assert.deepEqual(Object.keys(info), ['id', 'username'])
  })

  test('execute schema actions in sequence', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })

        this.create('schema_profiles', (table) => {
          table.increments()
          table.integer('user_id').unsigned().references('schema_users.id')
          table.string('profile_name')
        })
      }
    }

    await migration.up({ '2017-07-20': UserSchema })
    await migration.db.schema.hasTable('schema_users')
    await migration.db.schema.hasTable('schema_profiles')

    if (process.env.DB !== 'sqlite') {
      await ioc.use('Database').schema.table('schema_profiles', (table) => {
        table.dropForeign('user_id')
      })
    }
  })

  test('save executed schemas to the migrations table', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })

        this.create('schema_profiles', (table) => {
          table.increments()
          table.integer('user_id').unsigned().references('schema_users.id')
          table.string('profile_name')
        })
      }
    }

    const result = await migration.up({ '2017-07-20': UserSchema })
    const schemas = await migration.db.table('adonis_schema')
    assert.lengthOf(schemas, 1)
    assert.equal(schemas[0].name, '2017-07-20')
    assert.equal(schemas[0].batch, 1)
    assert.deepEqual(result, { migrated: ['2017-07-20'], status: 'completed' })

    if (process.env.DB !== 'sqlite') {
      await ioc.use('Database').schema.table('schema_profiles', (table) => {
        table.dropForeign('user_id')
      })
    }
  })

  test('skip migrations when there is nothing to rollback', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })

        this.create('schema_profiles', (table) => {
          table.increments()
          table.integer('user_id').unsigned().references('schema_users.id')
          table.string('profile_name')
        })
      }

      down () {}
    }

    const result = await migration.down({ '2017-07-20': UserSchema }, 0)
    assert.deepEqual(result, { migrated: [], status: 'skipped' })
  })

  test('rollback to the latest batch', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
        this.drop('schema_users')
      }
    }

    class UserProfileSchema extends Schema {
      up () {
        this.create('schema_profile', (table) => {
          table.increments()
          table.string('profile_name')
        })
      }

      down () {
        this.drop('schema_profile')
      }
    }

    await migration.up({ '2017-08-10': UserSchema })
    await migration.up({ '2017-08-11': UserProfileSchema })
    const result = await migration.down({ '2017-08-10': UserSchema, '2017-08-11': UserProfileSchema })
    assert.deepEqual(result, { migrated: ['2017-08-11'], status: 'completed' })
    const schemas = await ioc.use('Database').table('adonis_schema')
    assert.lengthOf(schemas, 1)
    assert.equal(schemas[0].name, '2017-08-10')
  })

  test('rollback to first version when batch is defined as zero', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
        this.drop('schema_users')
      }
    }

    class UserProfileSchema extends Schema {
      up () {
        this.create('schema_profile', (table) => {
          table.increments()
          table.string('profile_name')
        })
      }

      down () {
        this.drop('schema_profile')
      }
    }

    await migration.up({ '2017-08-10': UserSchema })
    await migration.up({ '2017-08-11': UserProfileSchema })
    const result = await migration.down({ '2017-08-10': UserSchema, '2017-08-11': UserProfileSchema }, 0)
    assert.deepEqual(result, { migrated: ['2017-08-11', '2017-08-10'], status: 'completed' })
    const schemas = await ioc.use('Database').table('adonis_schema')
    assert.lengthOf(schemas, 0)
  })

  test('throw schema file exceptions and cleanup', async (assert) => {
    assert.plan(3)
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      up () {
        this.create('users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
        this.drop('users')
      }
    }

    try {
      await migration.up({ '2017-08-10': UserSchema })
    } catch ({ message }) {
      assert.include(message, 'already exists')
      const hasLockTable = await ioc.use('Database').schema.hasTable('adonis_schema_lock')
      const migrated = await ioc.use('Database').table('adonis_schema')
      assert.lengthOf(migrated, 0)
      assert.isFalse(hasLockTable)
    }
  })

  test('on error rollback queries inside a single file', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      async up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })

        this.create('users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
      }
    }

    try {
      await migration.up({ '2017-08-10': UserSchema })
      assert.isFalse(true)
    } catch ({ message }) {
      assert.include(message, 'already exists')
      const hasLockTable = await ioc.use('Database').schema.hasTable('adonis_schema_lock')
      const migrated = await ioc.use('Database').table('adonis_schema')
      assert.lengthOf(migrated, 0)
      assert.isFalse(hasLockTable)

      if (process.env.DB !== 'mysql') {
        const hasSchemaUsers = await ioc.use('Database').schema.hasTable('schema_users')
        assert.isFalse(hasSchemaUsers)
      }
    }
  })

  test('return migrations status', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))

    class UserSchema extends Schema {
      async up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
      }
    }

    await migration.up({ '2017-08-10': UserSchema })
    const status = await migration.status({ '2017-08-10': UserSchema, '2017-08-12': UserSchema })
    assert.deepEqual(status, { '2017-08-10': 'Y', '2017-08-12': 'N' })
  })

  test('throw exceptions when migrations are locked', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    assert.plan(1)

    class UserSchema extends Schema {
      async up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
      }
    }

    try {
      await migration._makeLockTable()
      await migration._addLock()
      await migration.up({ '2017-08-10': UserSchema })
    } catch ({ message }) {
      assert.equal(message, 'Migrations are locked. Make sure you are not multiple migration scripts or delete `adonis_schema_lock` table manually')
    }
  })

  test('return status as skipped when there is nothing to migrate', async (assert) => {
    const migration = new Migration(new Config(), ioc.use('Database'))
    assert.plan(1)

    class UserSchema extends Schema {
      async up () {
        this.create('schema_users', (table) => {
          table.increments()
          table.string('username')
        })
      }

      down () {
      }
    }

    await migration.up({ '2017-08-10': UserSchema })
    const result = await migration.up({ '2017-08-10': UserSchema })
    assert.deepEqual(result, { migrated: [], status: 'skipped' })
  })
})

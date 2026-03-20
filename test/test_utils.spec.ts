/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { ListLoader } from '@adonisjs/core/ace'
import { AceFactory } from '@adonisjs/core/factories'

import DbSeed from '../commands/db_seed.js'
import Reset from '../commands/migration/reset.js'
import Migrate from '../commands/migration/run.js'
import DbTruncate from '../commands/db_truncate.js'
import SchemaDump from '../commands/schema_dump.js'
import Rollback from '../commands/migration/rollback.js'
import { AppFactory } from '@adonisjs/core/factories/app'
import { type ApplicationService } from '@adonisjs/core/types'
import { DatabaseTestUtils } from '../src/test_utils/database.js'
import { DatabaseTestAssertions } from '../src/test_utils/assertions.js'
import { column } from '../src/orm/decorators/index.js'
import {
  cleanupSchemaArtifacts,
  cleanupTestDatabase,
  createMigrationFile,
  getBaseModel,
  getDb,
  ormAdapter,
  resetTables,
  setup,
  supportsSchemaDump,
} from '../test-helpers/index.js'

test.group('Database Test Utils', (group) => {
  group.each.disableTimeout()

  group.each.setup(async ({ context }) => {
    await cleanupSchemaArtifacts(context.fs)
    await cleanupTestDatabase([
      'adonis_schema',
      'adonis_schema_versions',
      'schema_users',
      'schema_accounts',
    ])
    await setup()

    return async () => {
      await cleanupSchemaArtifacts(context.fs)
      await cleanupTestDatabase([
        'adonis_schema',
        'adonis_schema_versions',
        'schema_users',
        'schema_accounts',
      ])
    }
  })

  test('truncate() should run migration:run and db:truncate commands', async ({ fs, assert }) => {
    let migrationRun = false
    let truncateRun = false

    class FakeMigrate extends Migrate {
      override async run() {
        migrationRun = true
      }
    }

    class FakeDbTruncate extends DbTruncate {
      override async run() {
        truncateRun = true
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    ace.addLoader(new ListLoader([FakeMigrate, FakeDbTruncate]))

    const app = new AppFactory().create(fs.baseUrl, () => {})
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app as ApplicationService)
    const truncate = await dbTestUtils.truncate()

    await truncate()

    assert.isTrue(migrationRun)
    assert.isTrue(truncateRun)
  })

  test('truncate() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(2)

    class FakeMigrate extends Migrate {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    class FakeDbTruncate extends DbTruncate {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    ace.addLoader(new ListLoader([FakeMigrate, FakeDbTruncate]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app, 'secondary')
    const truncate = await dbTestUtils.truncate()

    await truncate()
  })

  test('seed() should run db:seed command', async ({ fs, assert }) => {
    assert.plan(1)

    class FakeDbSeed extends DbSeed {
      override async run() {
        assert.isTrue(true)
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    ace.addLoader(new ListLoader([FakeDbSeed]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    await dbTestUtils.seed()
  })

  test('seed() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(1)

    class FakeDbSeed extends DbSeed {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeDbSeed]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app, 'secondary')
    await dbTestUtils.seed()
  })

  test('migrate() should run migration:run and migration:reset commands', async ({
    fs,
    assert,
  }) => {
    let migrationRun = false
    let resetRun = false

    class FakeMigrate extends Migrate {
      override async run() {
        migrationRun = true
      }
    }

    class FakeMigrationRollback extends Reset {
      override async run() {
        resetRun = true
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate, FakeMigrationRollback]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    const rollback = await dbTestUtils.migrate()

    await rollback()

    assert.isTrue(migrationRun)
    assert.isTrue(resetRun)
  })

  test('migrate() with custom connectionName', async ({ fs, assert }) => {
    assert.plan(2)

    class FakeMigrate extends Migrate {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    class FakeMigrationRollback extends Reset {
      override async run() {
        assert.equal(this.connection, 'secondary')
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate, FakeMigrationRollback]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app, 'secondary')
    const rollback = await dbTestUtils.migrate()

    await rollback()
  })

  test('should throw error when command has an exitCode = 1', async ({ fs }) => {
    class FakeMigrate extends Migrate {
      override async run() {
        this.exitCode = 1
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    await dbTestUtils.migrate()
  }).throws('"migration:run" failed')

  test('should re-use command.error message if available', async ({ fs }) => {
    class FakeMigrate extends Migrate {
      override async run() {
        this.exitCode = 1
        this.error = new Error('Custom error message')
      }
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.addLoader(new ListLoader([FakeMigrate]))

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => getDb())
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    await dbTestUtils.migrate()
  }).throws('Custom error message')

  test('withGlobalTransaction should wrap and rollback a transaction', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })

    const app = new AppFactory().create(fs.baseUrl, () => {}) as ApplicationService
    await app.init()

    app.container.bind('lucid.db', () => db)
    app.container.bind('ace', () => ace)

    const dbTestUtils = new DatabaseTestUtils(app)
    const rollback = await dbTestUtils.withGlobalTransaction()

    assert.isDefined(db.connectionGlobalTransactions.get(db.primaryConnectionName))

    await rollback()

    assert.isUndefined(db.connectionGlobalTransactions.get(db.primaryConnectionName))
  })

  test('migrate() should bootstrap from a schema dump and keep squashed history on reset', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/test_utils_users_dump.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
      down: `
        this.schema.dropTable('schema_users')
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')
    ace.addLoader(new ListLoader([Migrate, Reset, Rollback, DbTruncate, SchemaDump]))

    const app = ace.app as ApplicationService
    app.container.bind('ace', () => ace)

    const initialMigrate = await ace.create(Migrate, ['--no-schema-generate'])
    await initialMigrate.exec()

    const dump = await ace.create(SchemaDump, ['--prune'])
    await dump.exec()

    await cleanupTestDatabase([
      'adonis_schema',
      'adonis_schema_versions',
      'schema_users',
      'schema_accounts',
    ])

    await createMigrationFile({
      filePath: 'database/migrations/test_utils_accounts_after_dump.ts',
      className: 'Account',
      up: `
        this.schema.createTable('schema_accounts', (table) => {
          table.increments()
        })
      `,
      down: `
        this.schema.dropTable('schema_accounts')
      `,
    })

    const dbTestUtils = new DatabaseTestUtils(app)
    const resetMigrations = await dbTestUtils.migrate()

    const migratedBeforeReset = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    assert.deepEqual(
      migratedBeforeReset.map(({ name }) => name),
      [
        'database/migrations/test_utils_users_dump',
        'database/migrations/test_utils_accounts_after_dump',
      ]
    )

    await resetMigrations()

    const migratedAfterReset = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.isTrue(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.deepEqual(
      migratedAfterReset.map(({ name }) => name),
      ['database/migrations/test_utils_users_dump']
    )
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')

  test('truncate() should bootstrap from a schema dump and keep the schema intact', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/test_utils_truncate_users_dump.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
          table.string('email')
        })
      `,
      down: `
        this.schema.dropTable('schema_users')
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')
    ace.addLoader(new ListLoader([Migrate, Reset, Rollback, DbTruncate, SchemaDump]))

    const app = ace.app as ApplicationService
    app.container.bind('ace', () => ace)

    const initialMigrate = await ace.create(Migrate, ['--no-schema-generate'])
    await initialMigrate.exec()

    const dump = await ace.create(SchemaDump, ['--prune'])
    await dump.exec()

    await cleanupTestDatabase([
      'adonis_schema',
      'adonis_schema_versions',
      'schema_users',
      'schema_accounts',
    ])

    await createMigrationFile({
      filePath: 'database/migrations/test_utils_truncate_accounts_after_dump.ts',
      className: 'Account',
      up: `
        this.schema.createTable('schema_accounts', (table) => {
          table.increments()
          table.string('name')
        })
      `,
      down: `
        this.schema.dropTable('schema_accounts')
      `,
    })

    const dbTestUtils = new DatabaseTestUtils(app)
    const truncateTables = await dbTestUtils.truncate()

    await db.connection().table('schema_users').insert({ email: 'virk@adonisjs.com' })
    await db.connection().table('schema_accounts').insert({ name: 'primary' })

    await truncateTables()

    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')
    const usersRows = await db.connection().from('schema_users').select('*')
    const accountsRows = await db.connection().from('schema_accounts').select('*')
    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')

    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.lengthOf(usersRows, 0)
    assert.lengthOf(accountsRows, 0)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      [
        'database/migrations/test_utils_truncate_users_dump',
        'database/migrations/test_utils_truncate_accounts_after_dump',
      ]
    )
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')
})

test.group('Database Test Assertions', (group) => {
  group.each.disableTimeout()

  group.each.setup(async () => {
    await setup()
    return async () => await resetTables()
  })

  test('assertHas should pass when matching rows exist', async () => {
    const db = getDb()
    await db.table('users').insert({ username: 'jul', email: 'jul@adonisjs.com' })

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertHas('users', { username: 'jul' })
  })

  test('assertHas should fail when no matching rows exist', async () => {
    const db = getDb()
    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertHas('users', { username: 'nonexistent' })
  }).throws(
    `Expected table 'users' to have rows matching {"username":"nonexistent"}, but none were found`
  )

  test('assertHas should pass when matching exact count', async () => {
    const db = getDb()
    await db.table('users').multiInsert([
      { username: 'jul', email: 'jul@adonisjs.com', points: 10 },
      { username: 'romain', email: 'romain@adonisjs.com', points: 10 },
    ])

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertHas('users', { points: 10 }, 2)
  })

  test('assertHas should fail when count does not match', async () => {
    const db = getDb()
    await db.table('users').insert({ username: 'jul', email: 'jul@adonisjs.com', points: 10 })

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertHas('users', { points: 10 }, 5)
  }).throws(`Expected table 'users' to have 5 rows matching {"points":10}, but found 1`)

  test('assertMissing should pass when no matching rows exist', async () => {
    const db = getDb()
    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertMissing('users', { username: 'jul' })
  })

  test('assertMissing should fail when matching rows exist', async () => {
    const db = getDb()
    await db.table('users').insert({ username: 'jul', email: 'jul@adonisjs.com' })

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertMissing('users', { username: 'jul' })
  }).throws(`Expected table 'users' to have no rows matching {"username":"jul"}, but found 1`)

  test('assertCount should pass with correct count', async () => {
    const db = getDb()
    await db.table('users').multiInsert([
      { username: 'jul', email: 'jul@adonisjs.com' },
      { username: 'romain', email: 'romain@adonisjs.com' },
    ])

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertCount('users', 2)
  })

  test('assertCount should fail with incorrect count', async () => {
    const db = getDb()
    await db.table('users').insert({ username: 'jul', email: 'jul@adonisjs.com' })

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertCount('users', 5)
  }).throws("Expected table 'users' to have 5 rows, but found 1")

  test('assertEmpty should pass on empty table', async () => {
    const db = getDb()
    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertEmpty('users')
  })

  test('assertEmpty should fail on non-empty table', async () => {
    const db = getDb()
    await db.table('users').insert({ username: 'jul', email: 'jul@adonisjs.com' })

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertEmpty('users')
  }).throws("Expected table 'users' to have 0 rows, but found 1")

  test('assertModelExists should pass when model exists in db', async () => {
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    user.fill({ username: 'jul', email: 'jul@adonisjs.com' })
    await user.save()

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertModelExists(user)
  })

  test('assertModelExists should fail when model does not exist in db', async ({ assert }) => {
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    user.fill({ username: 'jul', email: 'jul@adonisjs.com' })
    await user.save()

    const primaryKey = user.$primaryKeyValue
    await user.delete()

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await assert.rejects(
      () => dbAssertions.assertModelExists(user),
      `Expected 'User' model with primary key ${primaryKey} to exist, but it was not found`
    )
  })

  test('assertModelMissing should pass when model does not exist in db', async () => {
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    user.fill({ username: 'jul', email: 'jul@adonisjs.com' })
    await user.save()
    await user.delete()

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await dbAssertions.assertModelMissing(user)
  })

  test('assertModelMissing should fail when model still exists in db', async ({ assert }) => {
    const db = getDb()
    const adapter = ormAdapter(db)
    const BaseModel = getBaseModel(adapter)

    class User extends BaseModel {
      static table = 'users'

      @column({ isPrimary: true })
      declare id: number

      @column()
      declare username: string

      @column()
      declare email: string
    }

    const user = new User()
    user.fill({ username: 'jul', email: 'jul@adonisjs.com' })
    await user.save()

    const app = new AppFactory().create(
      new URL('./', import.meta.url),
      () => {}
    ) as ApplicationService
    await app.init()
    app.container.bind('lucid.db', () => db)

    const dbAssertions = new DatabaseTestAssertions(app)
    await assert.rejects(
      () => dbAssertions.assertModelMissing(user),
      `Expected 'User' model with primary key ${user.$primaryKeyValue} to not exist, but it was found`
    )
  })
})

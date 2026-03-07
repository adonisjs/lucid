/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import 'reflect-metadata'
import { test } from '@japa/runner'
import { ListLoader } from '@adonisjs/core/ace'
import { AceFactory } from '@adonisjs/core/factories'

import Migrate from '../../../commands/migration/run.js'
import SchemaDump from '../../../commands/schema_dump.js'
import SchemaGenerate from '../../../commands/schema_generate.js'
import {
  setup,
  cleanupTestDatabase,
  cleanupSchemaArtifacts,
  createMigrationFile,
  getDb,
} from '../../../test-helpers/index.js'

test.group('migration:run', (group) => {
  group.each.disableTimeout()

  group.each.setup(async ({ context }) => {
    await cleanupSchemaArtifacts(context.fs)
    await cleanupTestDatabase([
      'adonis_schema',
      'adonis_schema_versions',
      'schema_users',
      'schema_accounts',
      'schema_clients',
    ])
    await setup()
    return async () => {
      await cleanupSchemaArtifacts(context.fs)
      await cleanupTestDatabase([
        'adonis_schema',
        'adonis_schema_versions',
        'schema_users',
        'schema_accounts',
        'schema_clients',
      ])
    }
  })

  test('run migrations from default directory', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const schemaFileExists = await fs.exists('database/schema.ts')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/run_cmd_users')
    assert.equal(migrated[0].batch, 1)
    assert.isTrue(schemaFileExists)
  })

  test('skip migrations when already up to date', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('do not execute migrations in dry-run', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v1.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, ['--dry-run'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    assert.lengthOf(migrated, 0)
  })

  test('do not run migrations in production', async ({ fs, assert, cleanup }) => {
    assert.plan(1)

    process.env.NODE_ENV = 'production'
    cleanup(() => {
      delete process.env.NODE_ENV
    })

    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v2.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => {
        return import(filePath)
      },
    })

    await ace.app.init()
    await ace.app.boot()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, [])
    migrate.prompt
      .trap('You are in production environment. Want to continue running migrations?')
      .reject()

    await migrate.exec()

    assert.isFalse(await db.connection().schema.hasTable('adonis_schema'))
  })

  test('run migrations in production when --force flag is passed', async ({
    fs,
    assert,
    cleanup,
  }) => {
    process.env.NODE_ENV = 'production'
    cleanup(() => {
      delete process.env.NODE_ENV
    })

    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v3.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => {
        return import(filePath)
      },
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, ['--force'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/run_cmd_users_v3')
    assert.equal(migrated[0].batch, 1)
  })

  test('skip schema generation in production even with --force flag', async ({
    fs,
    assert,
    cleanup,
  }) => {
    process.env.NODE_ENV = 'production'
    cleanup(() => {
      delete process.env.NODE_ENV
    })

    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v7.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()

    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => {
        return import(filePath)
      },
    })
    await ace.app.init()
    await ace.app.boot()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--force'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const schemaFileExists = await fs.exists('database/schema.ts')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.isFalse(schemaFileExists)
  })

  test('run migrations with compact output should display one line', async ({ fs }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v4.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_clients_v4.ts',
      className: 'Client',
      up: `
        this.schema.createTable('schema_clients', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--compact-output'])
    await migrate.exec()

    migrate.assertLogMatches(/Executed 2 migrations/)
  })

  test('run already migrated migrations with compact output should display one line', async ({
    fs,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v5.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_clients_v5.ts',
      className: 'Client',
      up: `
        this.schema.createTable('schema_clients', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    const migrate = await ace.create(Migrate, ['--compact-output'])
    await migrate.exec()
    await migrate.exec()

    migrate.assertLogMatches(/Already up to date/)
  })

  test('skip schema generation when --no-schema-generate flag is passed', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_v6.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const schemaFileExists = await fs.exists('database/schema.ts')
    assert.isFalse(schemaFileExists)
  })

  test('load stored schema dump before running pending migrations', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_dump.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const initialMigrate = await ace.create(Migrate, [])
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
      filePath: 'database/migrations/run_cmd_accounts_after_dump.ts',
      className: 'Account',
      up: `
        this.schema.createTable('schema_accounts', (table) => {
          table.increments()
        })
      `,
    })

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.lengthOf(migrated, 2)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      ['database/migrations/run_cmd_users_dump', 'database/migrations/run_cmd_accounts_after_dump']
    )
    assert.deepEqual(
      migrated.map(({ batch }) => Number(batch)),
      [1, 2]
    )
    assert.isTrue(
      migrate.logger.getLogs().some((log) => log.message.includes('Restoring schema dump from'))
    )
    assert.isTrue(
      migrate.logger.getLogs().some((log) => log.message.includes('Schema dump restored'))
    )
  })

  test('do not load stored schema dump during dry-run', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_users_dry_dump.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const initialMigrate = await ace.create(Migrate, [])
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
      filePath: 'database/migrations/run_cmd_accounts_dry_after_dump.ts',
      className: 'Account',
      up: `
        this.schema.createTable('schema_accounts', (table) => {
          table.increments()
        })
      `,
    })

    const migrate = await ace.create(Migrate, ['--dry-run'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.isFalse(
      migrate.logger.getLogs().some((log) => log.message.includes('Restoring schema dump from'))
    )
  })

  test('ignore missing schema dump paths and run pending migrations normally', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_missing_dump_users.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--schema-path=tmp/schema/missing.sql'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.equal(migrate.exitCode, 0)
    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.isFalse(
      migrate.logger.getLogs().some((log) => log.message.includes('Restoring schema dump from'))
    )
  })

  test('do not load stored schema dumps when migrations already ran', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_existing_dump_users.ts',
      className: 'User',
      up: `
        this.schema.createTable('schema_users', (table) => {
          table.increments()
        })
      `,
    })

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([SchemaGenerate]))

    const initialMigrate = await ace.create(Migrate, [])
    await initialMigrate.exec()

    const dump = await ace.create(SchemaDump, ['--path=tmp/schema/existing.sql'])
    await dump.exec()

    await createMigrationFile({
      filePath: 'database/migrations/run_cmd_existing_dump_accounts.ts',
      className: 'Account',
      up: `
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
      `,
    })

    const migrate = await ace.create(Migrate, ['--schema-path=tmp/schema/existing.sql'])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.equal(migrate.exitCode, 0)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.lengthOf(migrated, 2)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      [
        'database/migrations/run_cmd_existing_dump_users',
        'database/migrations/run_cmd_existing_dump_accounts',
      ]
    )
    assert.isFalse(
      migrate.logger.getLogs().some((log) => log.message.includes('Restoring schema dump from'))
    )
  })
})

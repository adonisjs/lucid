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

import DbSeed from '../../../commands/db_seed.js'
import Reset from '../../../commands/migration/reset.js'
import Migrate from '../../../commands/migration/run.js'
import Refresh from '../../../commands/migration/refresh.js'
import Rollback from '../../../commands/migration/rollback.js'
import SchemaDump from '../../../commands/schema_dump.js'
import {
  setup,
  cleanupTestDatabase,
  cleanupSchemaArtifacts,
  createMigrationFile,
  getDb,
  supportsSchemaDump,
} from '../../../test-helpers/index.js'
import SchemaGenerate from '../../../commands/schema_generate.ts'

test.group('migration:refresh', (group) => {
  group.each.disableTimeout()

  group.each.setup(async ({ context }) => {
    await cleanupSchemaArtifacts(context.fs, ['database/seeders'])
    await cleanupTestDatabase([
      'adonis_schema',
      'adonis_schema_versions',
      'schema_users',
      'schema_accounts',
    ])
    await setup()

    return async () => {
      await cleanupSchemaArtifacts(context.fs, ['database/seeders'])
      await cleanupTestDatabase([
        'adonis_schema',
        'adonis_schema_versions',
        'schema_users',
        'schema_accounts',
      ])
    }
  })

  test('rollback to batch 0 and migrate database', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/refresh_cmd_users.ts',
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

    await createMigrationFile({
      filePath: 'database/migrations/refresh_cmd_posts.ts',
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

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([Reset, DbSeed, Migrate, Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const refresh = await ace.create(Refresh, [])
    await refresh.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')
    const schemaFileExists = await fs.exists('database/schema.ts')

    assert.lengthOf(migrated, 2)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.isTrue(schemaFileExists)
  })

  test('run seeders when --seed flag is passed', async ({ fs, assert }) => {
    await fs.create(
      'database/seeders/refresh_cmd_user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    await createMigrationFile({
      filePath: 'database/migrations/refresh_cmd_users_v1.ts',
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

    await createMigrationFile({
      filePath: 'database/migrations/posts.ts',
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

    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, {
      importer: (filePath) => import(filePath),
    })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    ace.addLoader(new ListLoader([Reset, DbSeed, Migrate, Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const refresh = await ace.create(Refresh, ['--seed'])
    await refresh.exec()

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })

  test('skip schema generation when --no-schema-generate flag is passed', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/refresh_cmd_users_v2.ts',
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

    ace.addLoader(new ListLoader([Reset, DbSeed, Migrate, Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const refresh = await ace.create(Refresh, ['--no-schema-generate'])
    await refresh.exec()

    const schemaFileExists = await fs.exists('database/schema.ts')
    assert.isFalse(schemaFileExists)
  })

  test('refresh pending migrations after squashing older ones', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/refresh_cmd_users_dump.ts',
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

    ace.addLoader(new ListLoader([Reset, DbSeed, Migrate, Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const dump = await ace.create(SchemaDump, ['--prune'])
    await dump.exec()

    await createMigrationFile({
      filePath: 'database/migrations/refresh_cmd_accounts_after_dump.ts',
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

    const secondMigrate = await ace.create(Migrate, ['--no-schema-generate'])
    await secondMigrate.exec()

    const refresh = await ace.create(Refresh, ['--no-schema-generate'])
    await refresh.exec()

    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.equal(refresh.exitCode, 0)
    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      [
        'database/migrations/refresh_cmd_users_dump',
        'database/migrations/refresh_cmd_accounts_after_dump',
      ]
    )
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')
})

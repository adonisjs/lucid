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

import Reset from '../../../commands/migration/reset.js'
import Migrate from '../../../commands/migration/run.js'
import Rollback from '../../../commands/migration/rollback.js'
import SchemaDump from '../../../commands/schema_dump.js'
import SchemaGenerate from '../../../commands/schema_generate.js'
import {
  setup,
  cleanupTestDatabase,
  cleanupSchemaArtifacts,
  createMigrationFile,
  getDb,
  supportsSchemaDump,
} from '../../../test-helpers/index.js'

test.group('migration:reset', (group) => {
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

  test('rollback to batch 0', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/reset_cmd_users.ts',
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
      filePath: 'database/migrations/reset_cmd_posts.ts',
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

    ace.addLoader(new ListLoader([Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const refresh = await ace.create(Reset, [])
    await refresh.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')
    const schemaFileExists = await fs.exists('database/schema.ts')

    assert.lengthOf(migrated, 0)
    assert.isFalse(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.isTrue(schemaFileExists)
  })

  test('skip schema generation when --no-schema-generate flag is passed', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/reset_cmd_users_v2.ts',
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

    ace.addLoader(new ListLoader([Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const reset = await ace.create(Reset, ['--no-schema-generate'])
    await reset.exec()

    const schemaFileExists = await fs.exists('database/schema.ts')
    assert.isFalse(schemaFileExists)
  })

  test('skip squashed migrations when resetting the database', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/reset_cmd_users_dump.ts',
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

    ace.addLoader(new ListLoader([Rollback, SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const dump = await ace.create(SchemaDump, ['--prune'])
    await dump.exec()

    await createMigrationFile({
      filePath: 'database/migrations/reset_cmd_accounts_after_dump.ts',
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

    const reset = await ace.create(Reset, ['--no-schema-generate'])
    await reset.exec()

    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.equal(reset.exitCode, 0)
    assert.isTrue(hasUsersTable)
    assert.isFalse(hasAccountsTable)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      ['database/migrations/reset_cmd_users_dump']
    )
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')
})

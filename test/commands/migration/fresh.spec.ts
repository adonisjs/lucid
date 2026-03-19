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
import { AceFactory } from '@adonisjs/core/factories'

import Migrate from '../../../commands/migration/run.js'
import Fresh from '../../../commands/migration/fresh.js'
import SchemaDump from '../../../commands/schema_dump.js'
import SchemaGenerate from '../../../commands/schema_generate.js'
import {
  setup,
  cleanupTestDatabase,
  cleanupSchemaArtifacts,
  createMigrationFile,
  getConfig,
  getDb,
  supportsSchemaDump,
} from '../../../test-helpers/index.js'
import { ListLoader } from '@adonisjs/core/ace'
import DbWipe from '../../../commands/db_wipe.js'
import DbSeed from '../../../commands/db_seed.js'

test.group('migrate:fresh', (group) => {
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

  test('migration:fresh should drop all tables and run migrations', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/fresh_cmd_users.ts',
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

    ace.addLoader(new ListLoader([DbWipe, DbSeed, Migrate, SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const migrated = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated, 1)
    assert.isTrue(hasUsersTable)
    assert.equal(migrated[0].name, 'database/migrations/fresh_cmd_users')
    assert.equal(migrated[0].batch, 1)

    const fresh = await ace.create(Fresh, [])
    await fresh.exec()

    const migrated1 = await db.connection().from('adonis_schema').select('*')
    const hasUsersTable1 = await db.connection().schema.hasTable('schema_users')

    assert.lengthOf(migrated1, 1)
    assert.isTrue(hasUsersTable1)
    assert.equal(migrated1[0].name, 'database/migrations/fresh_cmd_users')
    assert.equal(migrated1[0].batch, 1)
  })

  test('migration:fresh --seed should run seeders', async ({ fs, assert }) => {
    await fs.create(
      'database/seeders/fresh_cmd_user.ts',
      `export default class UserSeeder {
        public async run () {
          process.env.EXEC_USER_SEEDER = 'true'
        }
      }`
    )

    await createMigrationFile({
      filePath: 'database/migrations/fresh_cmd_users_v1.ts',
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

    ace.addLoader(new ListLoader([DbWipe, DbSeed, Migrate, SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const fresh = await ace.create(Fresh, ['--seed'])
    await fresh.exec()

    assert.equal(process.env.EXEC_USER_SEEDER, 'true')
    delete process.env.EXEC_USER_SEEDER
  })

  test('migration:fresh should forward custom schema path to migration:run', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/fresh_cmd_users_dump.ts',
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

    ace.addLoader(new ListLoader([DbWipe, DbSeed, Migrate, SchemaGenerate]))

    const migrate = await ace.create(Migrate, [])
    await migrate.exec()

    const dump = await ace.create(SchemaDump, ['--path=tmp/schema/fresh-custom.sql', '--prune'])
    await dump.exec()

    await createMigrationFile({
      filePath: 'database/migrations/fresh_cmd_accounts_after_dump.ts',
      className: 'Account',
      up: `
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
      `,
    })

    const fresh = await ace.create(Fresh, ['--schema-path=tmp/schema/fresh-custom.sql'])
    await fresh.exec()

    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const hasUsersTable = await db.connection().schema.hasTable('schema_users')
    const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')

    assert.isTrue(hasUsersTable)
    assert.isTrue(hasAccountsTable)
    assert.lengthOf(migrated, 2)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      [
        'database/migrations/fresh_cmd_users_dump',
        'database/migrations/fresh_cmd_accounts_after_dump',
      ]
    )
    assert.isTrue(
      fresh.logger.getLogs().some((log) => log.message.includes('Schema dump restored'))
    )
  }).skip(!supportsSchemaDump, 'Schema dumps are not supported for the current database dialect')

  if (process.env.DB === 'pg') {
    test('migration:fresh should restore dumps when custom postgres schemas already exist', async ({
      fs,
      assert,
      cleanup: testCleanup,
    }) => {
      const baseConfig = getConfig()
      const db = getDb(undefined, {
        connection: 'primary',
        connections: {
          primary: {
            ...baseConfig,
            searchPath: ['public', 'airdrops'],
          } as typeof baseConfig,
          secondary: getConfig(),
        },
      })

      testCleanup(async () => {
        await db.connection().rawQuery('DROP SCHEMA IF EXISTS "airdrops" CASCADE').exec()
      })

      await createMigrationFile({
        filePath: 'database/migrations/fresh_cmd_airdrops_dump.ts',
        className: 'AirdropsDump',
        up: `
          await this.schema.raw('CREATE SCHEMA IF NOT EXISTS "airdrops"')

          this.schema.withSchema('airdrops').createTable('schema_airdrops', (table) => {
            table.increments()
          })
        `,
      })

      const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
      await ace.app.init()
      ace.app.container.singleton('lucid.db', () => db)
      ace.ui.switchMode('raw')

      ace.addLoader(new ListLoader([DbWipe, DbSeed, Migrate, SchemaGenerate]))

      const migrate = await ace.create(Migrate, [])
      await migrate.exec()

      const dump = await ace.create(SchemaDump, ['--prune'])
      await dump.exec()

      await createMigrationFile({
        filePath: 'database/migrations/fresh_cmd_airdrops_after_dump.ts',
        className: 'AirdropsAfterDump',
        up: `
          this.schema.createTable('schema_accounts', (table) => {
            table.increments()
          })
        `,
      })

      const fresh = await ace.create(Fresh, [])
      await fresh.exec()

      const hasAirdropsTable = await db
        .connection()
        .schema.withSchema('airdrops')
        .hasTable('schema_airdrops')
      const hasAccountsTable = await db.connection().schema.hasTable('schema_accounts')
      const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')

      assert.equal(fresh.exitCode, 0)
      assert.isTrue(hasAirdropsTable)
      assert.isTrue(hasAccountsTable)
      assert.deepEqual(
        migrated.map(({ name }) => name),
        [
          'database/migrations/fresh_cmd_airdrops_dump',
          'database/migrations/fresh_cmd_airdrops_after_dump',
        ]
      )
      assert.isTrue(
        fresh.logger.getLogs().some((log) => log.message.includes('Schema dump restored'))
      )
    })
  }
})

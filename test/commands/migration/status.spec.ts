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
import Status from '../../../commands/migration/status.js'
import SchemaDump from '../../../commands/schema_dump.js'
import {
  setup,
  cleanupTestDatabase,
  cleanupSchemaArtifacts,
  createMigrationFile,
  getDb,
} from '../../../test-helpers/index.js'

function getRenderedTableRows(command: Status) {
  return command.logger
    .getLogs()
    .filter((log) => log.stream === 'stdout')
    .map((log) => log.message.split('|'))
}

test.group('migration:status', (group) => {
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

  test('mark pruned migrations as squashed', async ({ fs, assert }) => {
    await createMigrationFile({
      filePath: 'database/migrations/status_cmd_users.ts',
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

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()

    const dump = await ace.create(SchemaDump, ['--prune'])
    await dump.exec()
    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')
    const migrationFileExists = await fs.exists('database/migrations/status_cmd_users.ts')

    assert.equal(migrate.exitCode, 0)
    assert.equal(dump.exitCode, 0)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      ['database/migrations/status_cmd_users']
    )
    assert.isFalse(migrationFileExists)

    const status = await ace.create(Status, [])

    status.logger.flushLogs()
    await status.exec()
    const rows = getRenderedTableRows(status)

    assert.equal(status.exitCode, 0)
    assert.lengthOf(rows, 2)
    assert.deepEqual(rows[0], ['Name', 'Status', 'Batch', 'Message'])
    assert.equal(rows[1][0], 'database/migrations/status_cmd_users')
    assert.include(rows[1][1], 'squashed')
    assert.equal(
      rows[1][3],
      'The migration file was pruned after being squashed into a schema dump'
    )
  })

  test('keep missing migrations as corrupt when they are not part of a schema dump', async ({
    fs,
    assert,
  }) => {
    await createMigrationFile({
      filePath: 'database/migrations/status_cmd_accounts.ts',
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

    const migrate = await ace.create(Migrate, ['--no-schema-generate'])
    await migrate.exec()
    await fs.remove('database/migrations/status_cmd_accounts.ts')
    const migrated = await db.connection().from('adonis_schema').orderBy('id', 'asc')

    assert.equal(migrate.exitCode, 0)
    assert.deepEqual(
      migrated.map(({ name }) => name),
      ['database/migrations/status_cmd_accounts']
    )

    const status = await ace.create(Status, [])

    status.logger.flushLogs()
    await status.exec()
    const rows = getRenderedTableRows(status)

    assert.equal(status.exitCode, 0)
    assert.lengthOf(rows, 2)
    assert.deepEqual(rows[0], ['Name', 'Status', 'Batch', 'Message'])
    assert.equal(rows[1][0], 'database/migrations/status_cmd_accounts')
    assert.include(rows[1][1], 'corrupt')
    assert.equal(rows[1][3], 'The migration file is missing on filesystem')
  })
})

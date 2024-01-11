/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { AceFactory } from '@adonisjs/core/factories'

import MakeMigration from '../../commands/make_migration.js'
import { setup, getDb, cleanup, getConfig } from '../../test-helpers/index.js'

function fileNameFromLog(message: string) {
  return message
    .replace(/green\(DONE\:\)/, '')
    .trim()
    .replace(/^create/, '')
    .trim()
}

test.group('MakeMigration', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions', 'schema_users', 'schema_accounts'])
    }
  })

  test('create migration in the default migrations directory', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeMigration, ['users'])
    await command.exec()
    const filename = fileNameFromLog(command.logger.getLogs()[0].message)

    command.assertLogMatches(/database\/migrations\/\d+_create_users_table/)
    await assert.fileContains(filename, `import { BaseSchema } from '@adonisjs/lucid/schema'`)
    await assert.fileContains(filename, `protected tableName = 'users'`)
    await assert.fileContains(filename, `this.schema.createTable`)
  })

  test('create migration for alter table', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeMigration, ['users', '--alter'])
    await command.exec()
    const filename = fileNameFromLog(command.logger.getLogs()[0].message)

    command.assertLogMatches(/database\/migrations\/\d+_alter_users_table/)
    await assert.fileContains(filename, `import { BaseSchema } from '@adonisjs/lucid/schema'`)
    await assert.fileContains(filename, `protected tableName = 'users'`)
    await assert.fileContains(filename, `this.schema.alterTable`)
  })

  test('create migration file inside a sub-folder', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeMigration, ['invoices/lineItem', '--alter'])
    await command.exec()
    const filename = fileNameFromLog(command.logger.getLogs()[0].message)

    command.assertLogMatches(/database\/migrations\/invoices\/\d+_alter_line_items_table/)
    await assert.fileContains(filename, `import { BaseSchema } from '@adonisjs/lucid/schema'`)
    await assert.fileContains(filename, `protected tableName = 'line_items'`)
    await assert.fileContains(filename, `this.schema.alterTable`)
  })

  test('print error when using an invalid db connection', async ({ fs }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeMigration, ['users', '--connection', 'foo'])
    await command.exec()

    command.assertFailed()
    command.assertLog(
      '[ red(error) ] "foo" is not a valid connection name. Double check "config/database" file',
      'stderr'
    )
  })

  test('pick directory from migration sources').run(async ({ fs }) => {
    const db = getDb(undefined, {
      connection: 'primary',
      connections: {
        primary: Object.assign(getConfig(), {
          migrations: {
            paths: ['database/foo', './database/bar'],
          },
        }),
      },
    })

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    ace.app.container.singleton('lucid.db', () => db)
    await ace.app.init()
    ace.ui.switchMode('raw')

    const command = await ace.create(MakeMigration, ['users'])
    command.prompt.trap('Select the migrations folder').chooseOption(0)

    await command.exec()
    command.assertLogMatches(/database\/foo\/\d+_create_users_table/)
  })
})

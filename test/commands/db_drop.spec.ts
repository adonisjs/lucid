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

import DbDrop from '../../commands/db_drop.js'
import { type DatabaseConfig } from '../../src/types/database.js'
import { getDb, getDbManagementConfig } from '../../test-helpers/index.js'
import { DatabaseAdministrator } from '../../src/database_administrator/index.js'

function getDatabaseConfig(): DatabaseConfig {
  return {
    connection: 'primary',
    connections: {
      primary: getDbManagementConfig(),
    },
  }
}

test.group('db:drop', (group) => {
  group.each.teardown(async () => {
    const administrator = new DatabaseAdministrator(getDbManagementConfig())
    try {
      if (await administrator.databaseExists()) {
        await administrator.dropDatabase()
      }
    } finally {
      await administrator.disconnect()
    }
  })

  test('drop database', async ({ fs, assert }) => {
    const administrator = new DatabaseAdministrator(getDbManagementConfig())
    try {
      await administrator.createDatabase()
    } finally {
      await administrator.disconnect()
    }

    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb(undefined, getDatabaseConfig()))
    ace.ui.switchMode('raw')

    const dbDrop = await ace.create(DbDrop, [])
    await dbDrop.exec()

    const postDropAdministrator = new DatabaseAdministrator(getDbManagementConfig())
    try {
      assert.isFalse(await postDropAdministrator.databaseExists())
    } finally {
      await postDropAdministrator.disconnect()
    }
  })

  test('report when database does not exist', async ({ fs }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb(undefined, getDatabaseConfig()))
    ace.ui.switchMode('raw')

    const dbDrop = await ace.create(DbDrop, [])
    await dbDrop.exec()

    dbDrop.assertLogMatches(/does not exist/)
  })

  test('print error when using an invalid connection name', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb(undefined, getDatabaseConfig()))
    ace.ui.switchMode('raw')

    const dbDrop = await ace.create(DbDrop, ['--connection', 'foo'])
    await dbDrop.exec()

    assert.equal(dbDrop.exitCode, 1)
    dbDrop.assertLogMatches(/is not a valid connection name/)
  })
})

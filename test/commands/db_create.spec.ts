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

import DbCreate from '../../commands/db_create.js'
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

test.group('db:create', (group) => {
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

  test('create database', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb(undefined, getDatabaseConfig()))
    ace.ui.switchMode('raw')

    const dbCreate = await ace.create(DbCreate, [])
    await dbCreate.exec()

    const administrator = new DatabaseAdministrator(getDbManagementConfig())
    try {
      assert.isTrue(await administrator.databaseExists())
    } finally {
      await administrator.disconnect()
    }
  })

  test('report when database already exists', async ({ fs }) => {
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

    const dbCreate = await ace.create(DbCreate, [])
    await dbCreate.exec()

    dbCreate.assertLogMatches(/already exists/)
  })

  test('print error when using an invalid connection name', async ({ fs, assert }) => {
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => getDb(undefined, getDatabaseConfig()))
    ace.ui.switchMode('raw')

    const dbCreate = await ace.create(DbCreate, ['--connection', 'foo'])
    await dbCreate.exec()

    assert.equal(dbCreate.exitCode, 1)
    dbCreate.assertLogMatches(/is not a valid connection name/)
  })
})

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

import DbTruncate from '../../commands/db_truncate.js'
import { setup, cleanup, getDb } from '../../test-helpers/index.js'

test.group('db:truncate', (group) => {
  group.each.setup(async () => {
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions'])
    }
  })

  test('should truncate all tables', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    await db.table('users').insert({ username: 'bonjour' })
    await db.table('users').insert({ username: 'bonjour2' })
    await db.table('friends').insert({ username: 'bonjour' })

    const command = await ace.create(DbTruncate, [])
    await command.exec()

    const usersCount = await db.from('users').count('*', 'total')
    const friendsCount = await db.from('friends').count('*', 'total')

    assert.equal(usersCount[0]['total'], 0)
    assert.equal(friendsCount[0]['total'], 0)
  })

  test('should not truncate adonis migrations tables', async ({ fs, assert }) => {
    const db = getDb()
    const ace = await new AceFactory().make(fs.baseUrl, { importer: () => {} })
    await ace.app.init()
    ace.app.container.singleton('lucid.db', () => db)
    ace.ui.switchMode('raw')

    await db.connection().schema.createTable('adonis_schema', (table) => {
      table.increments('id')
      table.string('name')
    })

    await db.connection().schema.createTable('adonis_schema_versions', (table) => {
      table.increments('id')
      table.string('name')
    })

    await db.table('adonis_schema').insert({ name: 'bonjour' })
    await db.table('adonis_schema_versions').insert({ name: 'bonjour' })

    const command = await ace.create(DbTruncate, [])
    await command.exec()

    const adonisSchemaCount = await db.from('adonis_schema').count('*', 'total')
    const adonisSchemaVersionsCount = await db.from('adonis_schema_versions').count('*', 'total')

    assert.equal(adonisSchemaCount[0]['total'], 1)
    assert.equal(adonisSchemaVersionsCount[0]['total'], 1)
  })
})

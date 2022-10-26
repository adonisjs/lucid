/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Kernel } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { fs, setup, cleanup, getDb, setupApplication } from '../../test-helpers'
import DbTruncate from '../../commands/DbTruncate'

let app: ApplicationContract
let db: ReturnType<typeof getDb>

test.group('db:truncate', (group) => {
  group.each.setup(async () => {
    app = await setupApplication()
    return () => fs.cleanup()
  })

  group.each.setup(async () => {
    db = getDb(app)
    app.container.bind('Adonis/Lucid/Database', () => db)
    await setup()

    return async () => {
      await cleanup()
      await cleanup(['adonis_schema', 'adonis_schema_versions'])
      await db.manager.closeAll()
    }
  })

  test('should truncate all tables', async ({ assert }) => {
    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([DbTruncate])

    await db.table('users').insert({ username: 'bonjour' })
    await db.table('users').insert({ username: 'bonjour2' })
    await db.table('friends').insert({ username: 'bonjour' })

    await kernel.exec('db:truncate', [])

    const usersCount = await db.from('users').count('*', 'total')
    const friendsCount = await db.from('friends').count('*', 'total')

    assert.equal(usersCount[0]['total'], 0)
    assert.equal(friendsCount[0]['total'], 0)
  })

  test('should not truncate adonis migrations tables', async ({ assert }) => {
    const kernel = new Kernel(app).mockConsoleOutput()
    kernel.register([DbTruncate])

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

    await kernel.exec('db:truncate', [])

    const adonisSchemaCount = await db.from('adonis_schema').count('*', 'total')
    const adonisSchemaVersionsCount = await db.from('adonis_schema_versions').count('*', 'total')

    assert.equal(adonisSchemaCount[0]['total'], 1)
    assert.equal(adonisSchemaVersionsCount[0]['total'], 1)
  })
})

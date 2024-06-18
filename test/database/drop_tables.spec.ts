/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Connection } from '../../src/connection/index.js'
import { QueryClient } from '../../src/query_client/index.js'
import { getConfig, setup, cleanup, logger, createEmitter } from '../../test-helpers/index.js'

test.group('Query client | drop tables', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup(['temp_posts', 'temp_users', 'table_that_should_not_be_dropped', 'ignore_me'])
    await cleanup()
  })

  test('drop all tables', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    await connection.client!.schema.createTableIfNotExists('temp_users', (table) => {
      table.increments('id')
    })

    await connection.client!.schema.createTableIfNotExists('temp_posts', (table) => {
      table.increments('id')
      table.integer('temp_users_id').unsigned().references('id').inTable('temp_users')
    })

    const client = new QueryClient('dual', connection, createEmitter())
    await client.dialect.dropAllTables(['public'])

    assert.isFalse(await connection.client!.schema.hasTable('temp_users'))
    assert.isFalse(await connection.client!.schema.hasTable('temp_posts'))
    assert.isFalse(await connection.client!.schema.hasTable('users'))
    assert.isFalse(await connection.client!.schema.hasTable('uuid_users'))
    assert.isFalse(await connection.client!.schema.hasTable('follows'))
    assert.isFalse(await connection.client!.schema.hasTable('friends'))
    assert.isFalse(await connection.client!.schema.hasTable('countries'))
    assert.isFalse(await connection.client!.schema.hasTable('skills'))
    assert.isFalse(await connection.client!.schema.hasTable('skill_user'))
    assert.isFalse(await connection.client!.schema.hasTable('posts'))
    assert.isFalse(await connection.client!.schema.hasTable('comments'))
    assert.isFalse(await connection.client!.schema.hasTable('profiles'))
    assert.isFalse(await connection.client!.schema.hasTable('identities'))

    await connection.disconnect()
  })

  test('drop all tables should not throw when there are no tables', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    const client = new QueryClient('dual', connection, createEmitter())

    try {
      await client.dropAllTables()
      await client.dropAllTables()
    } catch (err) {
      assert.fail(err)
    }

    await connection.disconnect()
  })

  test('drop all tables except those defined in ignoreTables', async ({ assert }) => {
    const config = getConfig()
    config.wipe = {}
    config.wipe.ignoreTables = ['table_that_should_not_be_dropped', 'ignore_me']

    const connection = new Connection('primary', config, logger)
    connection.connect()

    await connection.client!.schema.createTableIfNotExists('temp_users', (table) => {
      table.increments('id')
    })

    await connection.client!.schema.createTableIfNotExists('temp_posts', (table) => {
      table.increments('id')
    })

    await connection.client!.schema.createTableIfNotExists(
      'table_that_should_not_be_dropped',
      (table) => table.increments('id')
    )

    await connection.client!.schema.createTableIfNotExists('ignore_me', (table) =>
      table.increments('id')
    )

    const client = new QueryClient('dual', connection, createEmitter())
    await client.dialect.dropAllTables(['public'])

    assert.isFalse(await connection.client!.schema.hasTable('temp_users'))
    assert.isFalse(await connection.client!.schema.hasTable('temp_posts'))
    assert.isTrue(await connection.client!.schema.hasTable('table_that_should_not_be_dropped'))
    assert.isTrue(await connection.client!.schema.hasTable('ignore_me'))

    await connection.disconnect()
  })

  test('drop tables with foreign keys constraint', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    await connection.client!.schema.createTableIfNotExists('temp_users', (table) => {
      table.increments('id')
    })

    await connection.client!.schema.createTableIfNotExists('temp_posts', (table) => {
      table.increments('id')
      table.integer('temp_users_id').unsigned().references('id').inTable('temp_users')
    })

    await connection.client?.table('temp_users').insert({})
    const user = await connection.client?.table('temp_users').select('id').first()
    await connection.client?.table('temp_posts').insert({ temp_users_id: user!.id })

    const client = new QueryClient('dual', connection, createEmitter())
    await client.dialect.dropAllTables(['public'])

    assert.isFalse(await connection.client!.schema.hasTable('temp_users'))
    assert.isFalse(await connection.client!.schema.hasTable('temp_posts'))

    await connection.disconnect()
  })

  if (['better_sqlite', 'sqlite', 'libsql'].includes(process.env.DB!)) {
    test('drop tables when PRAGMA foreign_keys is enabled', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()

      await connection.client!.schema.createTable('temp_posts', (table) => {
        table.increments('id')
      })

      await connection.client!.schema.createTableIfNotExists('temp_users', (table) => {
        table.increments('id')
        table.integer('temp_posts_id').unsigned().references('id').inTable('temp_posts')
      })

      await connection.client?.table('temp_posts').insert({ id: 1 })
      await connection.client?.table('temp_users').insert({ id: 1, temp_posts_id: 1 })

      const client = new QueryClient('dual', connection, createEmitter())

      await client.rawQuery('PRAGMA foreign_keys = ON;')
      await client.dialect.dropAllTables(['public'])

      assert.isFalse(await connection.client!.schema.hasTable('temp_users'))
      assert.isFalse(await connection.client!.schema.hasTable('temp_posts'))

      await connection.disconnect()
    })
  }
})

/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../../adonis-typings/index.ts" />

import test from 'japa'
import { join } from 'path'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Connection } from '../../src/Connection'
import { QueryClient } from '../../src/QueryClient'
import { fs, getConfig, setup, cleanup, setupApplication } from '../../test-helpers'

let app: ApplicationContract

test.group('Query client | drop tables', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup()
  })

  group.after(async () => {
    await cleanup(['temp_posts', 'temp_users'])
    await cleanup()
    await fs.cleanup()
  })

  test('drop all tables', async (assert) => {
    await fs.fsExtra.ensureDir(join(fs.basePath, 'temp'))
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    await connection.client!.schema.createTableIfNotExists('temp_users', (table) => {
      table.increments('id')
    })

    await connection.client!.schema.createTableIfNotExists('temp_posts', (table) => {
      table.increments('id')
      table.integer('temp_users_id').unsigned().references('id').inTable('temp_users')
    })

    const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))
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
  })
})

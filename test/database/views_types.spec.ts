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

test.group('Query client | Views, types and domains', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup(['temp_posts', 'temp_users'])
    await cleanup()
  })

  if (['sqlite', 'mysql', 'pg'].includes(process.env.DB!)) {
    test('Get all views', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      const client = new QueryClient('dual', connection, createEmitter())

      await connection.client!.schema.createView('users_view', async (view) => {
        view.columns(['username', 'email'])
        view.as(connection.client!('users').select('username', 'email'))
      })

      await connection.client!.schema.createView('follows_view', async (view) => {
        view.columns(['user_id'])
        view.as(connection.client!('follows').select('user_id'))
      })

      const allViews = await client.getAllViews(['public'])
      assert.deepEqual(allViews.sort(), ['users_view', 'follows_view'].sort())

      await client.dropAllViews()
      await connection.disconnect()
    })

    test('Drop all views', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      const client = new QueryClient('dual', connection, createEmitter())

      await connection.client!.schema.createView('users_view', async (view) => {
        view.columns(['username', 'email'])
        view.as(connection.client!('users').select('username', 'email'))
      })

      await connection.client!.schema.createView('follows_view', async (view) => {
        view.columns(['user_id'])
        view.as(connection.client!('follows').select('user_id'))
      })

      let allViews = await client.getAllViews(['public'])
      assert.deepEqual(allViews.sort(), ['users_view', 'follows_view'].sort())

      await client.dropAllViews()

      allViews = await client.getAllViews(['public'])
      assert.equal(allViews.length, 0)

      await connection.disconnect()
    })
  }

  if (['pg'].includes(process.env.DB!)) {
    test('Get all types', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      const client = new QueryClient('dual', connection, createEmitter())

      await client.rawQuery(`CREATE TYPE "user_type" AS ENUM ('admin', 'user')`)
      const types = await client.getAllTypes(['public'])

      assert.equal(types.length, 1)
      assert.equal(types[0], 'user_type')

      await client.dropAllTypes()
      await connection.disconnect()
    })

    test('Drop all types', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      const client = new QueryClient('dual', connection, createEmitter())

      await client.rawQuery(`CREATE TYPE "user_type" AS ENUM ('admin', 'user')`)
      await client.dropAllTypes()
      const types = await client.getAllTypes()

      assert.equal(types.length, 0)
      await connection.disconnect()
    })

    test('Get all domains', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      const client = new QueryClient('dual', connection, createEmitter())

      await client.rawQuery(`CREATE DOMAIN "email_domain" AS VARCHAR(255)`)
      const domains = await client.getAllDomains(['public'])

      assert.isTrue(domains.includes('email_domain'))

      await client.dropAllDomains()
      await connection.disconnect()
    })

    test('Drop all domains', async ({ assert }) => {
      const connection = new Connection('primary', getConfig(), logger)
      connection.connect()
      const client = new QueryClient('dual', connection, createEmitter())

      await client.rawQuery(`CREATE DOMAIN "email_domain" AS VARCHAR(255)`)
      await client.dropAllDomains()
      const domains = await client.getAllDomains()

      assert.isFalse(domains.includes('email_domain'))
      await connection.disconnect()
    })
  }
})

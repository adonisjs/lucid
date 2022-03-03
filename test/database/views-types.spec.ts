/// <reference path="../../adonis-typings/index.ts" />

import { test } from '@japa/runner'
import { join } from 'path'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Connection } from '../../src/Connection'
import { QueryClient } from '../../src/QueryClient'
import { fs, getConfig, setup, cleanup, setupApplication } from '../../test-helpers'

let app: ApplicationContract

test.group('Query client | Views and types', (group) => {
  group.setup(async () => {
    app = await setupApplication()
    await setup()
  })

  group.teardown(async () => {
    await cleanup(['temp_posts', 'temp_users'])
    await cleanup()
    await fs.cleanup()
  })

  if (['sqlite', 'mysql', 'pg'].includes(process.env.DB!)) {
    test('Get all views', async ({ assert }) => {
      await fs.fsExtra.ensureDir(join(fs.basePath, 'temp'))
      const connection = new Connection('primary', getConfig(), app.logger)
      connection.connect()
      const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))

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
      await fs.fsExtra.ensureDir(join(fs.basePath, 'temp'))
      const connection = new Connection('primary', getConfig(), app.logger)
      connection.connect()
      const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))

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
      await fs.fsExtra.ensureDir(join(fs.basePath, 'temp'))
      const connection = new Connection('primary', getConfig(), app.logger)
      connection.connect()
      const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))

      await client.rawQuery(`CREATE TYPE "user_type" AS ENUM ('admin', 'user')`)
      const types = await client.getAllTypes(['public'])

      assert.equal(types.length, 1)
      assert.equal(types[0], 'user_type')

      await client.dropAllTypes()
      await connection.disconnect()
    })

    test('Drop all types', async ({ assert }) => {
      await fs.fsExtra.ensureDir(join(fs.basePath, 'temp'))
      const connection = new Connection('primary', getConfig(), app.logger)
      connection.connect()
      const client = new QueryClient('dual', connection, app.container.use('Adonis/Core/Event'))

      await client.rawQuery(`CREATE TYPE "user_type" AS ENUM ('admin', 'user')`)
      await client.dropAllTypes()
      const types = await client.getAllTypes()

      assert.equal(types.length, 0)
      await connection.disconnect()
    })
  }
})

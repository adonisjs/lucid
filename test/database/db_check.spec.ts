/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { Database } from '../../src/database/main.js'
import { DbCheck } from '../../src/database/checks/db_check.js'
import { getConfig, setup, cleanup, logger, createEmitter } from '../../test-helpers/index.js'

test.group('Db connection check', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('perform health check for a connection', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())

    const healthCheck = new DbCheck(db.connection())
    const result = await healthCheck.run()
    assert.containsSubset(result, {
      message: 'Successfully connected to the database server',
      status: 'ok',
      meta: { connection: { name: 'primary', dialect: config.connections.primary.client } },
    })

    await db.manager.closeAll()
  })

  test('report error when unable to connect', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: {
        primary: {
          client: 'mysql2' as const,
          connection: {
            host: 'localhost',
            port: 3333,
          },
        },
      },
    }

    const db = new Database(config, logger, createEmitter())

    const healthCheck = new DbCheck(db.connection())
    const result = await healthCheck.run()
    assert.containsSubset(result, {
      message: 'Connection failed',
      status: 'error',
      meta: { connection: { name: 'primary', dialect: 'mysql' } },
    })
    assert.equal(result.meta?.error.code, 'ECONNREFUSED')

    await db.manager.closeAll()
  })
})

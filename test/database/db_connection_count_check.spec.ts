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
import { getConfig, setup, cleanup, logger, createEmitter } from '../../test-helpers/index.js'
import { DbConnectionCountCheck } from '../../src/database/checks/db_connection_count_check.js'

test.group('Db connection count check', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('return error when failure threshold has been crossed', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection()

    const healthCheck = new DbConnectionCountCheck(client).compute(async () => {
      return 20
    })

    const result = await healthCheck.run()
    assert.containsSubset(result, {
      message: 'There are 20 active connections, which is above the threshold of 15 connections',
      status: 'error',
      meta: {
        connection: { name: 'primary', dialect: client.dialect.name },
        connectionsCount: {
          active: 20,
          failureThreshold: 15,
          warningThreshold: 10,
        },
      },
    })

    await db.manager.closeAll()
  })

  test('return warning when warning threshold has been crossed', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection()

    const healthCheck = new DbConnectionCountCheck(client).compute(async () => {
      return 12
    })

    const result = await healthCheck.run()
    assert.containsSubset(result, {
      message: 'There are 12 active connections, which is above the threshold of 10 connections',
      status: 'warning',
      meta: {
        connection: { name: 'primary', dialect: client.dialect.name },
        connectionsCount: {
          active: 12,
          failureThreshold: 15,
          warningThreshold: 10,
        },
      },
    })

    await db.manager.closeAll()
  })

  test('return success when unable to compute connections count', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection()

    const healthCheck = new DbConnectionCountCheck(client).compute(async () => {
      return null
    })

    const result = await healthCheck.run()
    assert.containsSubset(result, {
      message: `Check skipped. Unable to get active connections for ${config.connections.primary.client} dialect`,
      status: 'ok',
      meta: {
        connection: { name: 'primary', dialect: client.dialect.name },
      },
    })

    await db.manager.closeAll()
  })

  test('get PostgreSQL connections count', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection()

    const healthCheck = new DbConnectionCountCheck(client)

    const result = await healthCheck.run()
    const activeConnections = result.meta?.connectionsCount.active

    assert.containsSubset(result, {
      message: `There are ${activeConnections} active connections, which is under the defined thresholds`,
      status: 'ok',
      meta: {
        connection: { name: 'primary', dialect: client.dialect.name },
        connectionsCount: {
          active: activeConnections,
          failureThreshold: 15,
          warningThreshold: 10,
        },
      },
    })

    await db.manager.closeAll()
  }).skip(process.env.DB !== 'pg', 'Only for PostgreSQL')

  test('get MySQL connections count', async ({ assert }) => {
    const config = {
      connection: 'primary',
      connections: { primary: getConfig() },
    }

    const db = new Database(config, logger, createEmitter())
    const client = db.connection()

    const healthCheck = new DbConnectionCountCheck(client)

    const result = await healthCheck.run()
    const activeConnections = result.meta?.connectionsCount.active

    assert.containsSubset(result, {
      message: `There are ${activeConnections} active connections, which is under the defined thresholds`,
      status: 'ok',
      meta: {
        connection: { name: 'primary', dialect: client.dialect.name },
        connectionsCount: {
          active: activeConnections,
          failureThreshold: 15,
          warningThreshold: 10,
        },
      },
    })

    await db.manager.closeAll()
  }).skip(!['mysql', 'mysql_legacy'].includes(process.env.DB!), 'Only for MySQL')
})

/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type Knex } from 'knex'
import { test } from '@japa/runner'
import { type MysqlConfig } from '../../src/types/database.js'
import { Connection } from '../../src/connection/index.js'
import { setup, cleanup, getConfig, resetTables, logger } from '../../test-helpers/index.js'

if (!['sqlite', 'better_sqlite', 'libsql'].includes(process.env.DB!)) {
  test.group('Connection | config', (group) => {
    group.setup(async () => {
      await setup()
    })

    group.teardown(async () => {
      await cleanup()
    })

    test('get write config by merging values from connection', ({ assert }) => {
      const config = getConfig()
      config.replicas! = {
        write: {
          connection: {
            host: '10.0.0.1',
          },
        },
        read: {
          connection: [
            {
              host: '10.0.0.1',
            },
          ],
        },
      }

      const connection = new Connection('primary', config, logger)
      const writeConfig = connection['getWriteConfig']()

      assert.equal(writeConfig.client, config.client)
      assert.equal((writeConfig.connection as Knex.ConnectionConfig).host, '10.0.0.1')
    })

    test('get read config by merging values from connection', ({ assert }) => {
      const config = getConfig()
      config.replicas! = {
        write: {
          connection: {
            host: '10.0.0.1',
          },
        },
        read: {
          connection: [
            {
              host: '10.0.0.1',
            },
          ],
        },
      }

      const connection = new Connection('primary', config, logger)
      const readConfig = connection['getReadConfig']()

      assert.equal(readConfig.client, config.client)
    })

    test('writeConfigResolver calls connection function when connection is a resolver', async ({
      assert,
    }) => {
      const config = getConfig()
      const resolvedConfig = { host: '10.0.0.1', user: 'dynamic_user', password: 'token' }
      config.connection = () => resolvedConfig

      const connection = new Connection('primary', config, logger)
      const result = await connection['writeConfigResolver'](config)

      assert.deepEqual(result, resolvedConfig)
    })

    test('writeConfigResolver calls async connection function when connection is an async resolver', async ({
      assert,
    }) => {
      const config = getConfig()
      const resolvedConfig = { host: '10.0.0.1', user: 'dynamic_user', password: 'iam_token' }
      config.connection = async () => resolvedConfig

      const connection = new Connection('primary', config, logger)
      const result = await connection['writeConfigResolver'](config)

      assert.deepEqual(result, resolvedConfig)
    })

    test('readConfigResolver calls connection function when connection is a resolver', async ({
      assert,
    }) => {
      const config = getConfig()
      const resolvedConfig = { host: '10.0.0.1', user: 'dynamic_user', password: 'token' }
      config.connection = () => resolvedConfig

      const connection = new Connection('primary', config, logger)
      const result = await connection['readConfigResolver'](config)

      assert.deepEqual(result, resolvedConfig)
    })

    test('get write config stores function resolver and uses empty placeholder when write replica connection is a function', ({
      assert,
    }) => {
      const config = getConfig()
      const resolver = () => ({ host: '10.0.0.1' })
      config.replicas! = {
        write: {
          connection: resolver as any,
        },
        read: {
          connection: [{ host: '10.0.0.1' }],
        },
      }

      const connection = new Connection('primary', config, logger)
      const writeConfig = connection['getWriteConfig']()

      /**
       * The connection property is a placeholder so Knex can initialise cleanly.
       * The actual resolver is stored in writeReplicaResolver and invoked per-acquisition.
       */
      assert.deepEqual(writeConfig.connection, {})
      assert.equal(connection['writeReplicaResolver'], resolver)
    })
  })
}

test.group('Connection | setup', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  group.each.teardown(async () => {
    await resetTables()
  })

  test('do not instantiate knex unless connect is called', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    assert.isUndefined(connection.client)
  })

  test('instantiate knex when connect is invoked', async ({ assert }, done) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.on('connect', async () => {
      assert.isDefined(connection.client!)
      assert.equal(connection.pool!.numUsed(), 0)
      await connection.disconnect()
      done()
    })

    connection.connect()
  }).waitForDone()

  test('on disconnect destroy knex', async ({ assert }) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()
    await connection.disconnect()

    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)
  })

  test('on disconnect emit disconnect event', async ({ assert }, done) => {
    const connection = new Connection('primary', getConfig(), logger)
    connection.connect()

    connection.on('disconnect', () => {
      assert.isUndefined(connection.client)
      done()
    })

    await connection.disconnect()
  }).waitForDone()

  test('cleanup read/write clients when connection is closed', async ({ assert }) => {
    let disconnectEmitsCount = 0

    const config = getConfig()
    config.replicas! = {
      write: {
        connection: {
          host: '10.0.0.1',
        },
      },
      read: {
        connection: [
          {
            host: '10.0.0.1',
          },
        ],
      },
    }

    const connection = new Connection('primary', config, logger)
    connection.connect()
    connection.readPool?.on('poolDestroySuccess', () => {
      disconnectEmitsCount++
    })
    connection.pool?.on('poolDestroySuccess', () => {
      disconnectEmitsCount++
    })

    await connection.disconnect()

    assert.equal(disconnectEmitsCount, 2)
    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)
  }).skip(['sqlite', 'better_sqlite', 'libsql'].includes(process.env.DB!))
})

if (process.env.DB === 'mysql') {
  test.group('Connection | setup mysql', () => {
    test('pass user config to mysql driver', async ({ assert }) => {
      const config = getConfig() as MysqlConfig
      ;(config.connection as Exclude<MysqlConfig['connection'], Function>)!.charset = 'utf-8'
      ;(config.connection as Exclude<MysqlConfig['connection'], Function>)!.typeCast = false

      const connection = new Connection('primary', config, logger)
      connection.connect()

      assert.equal((connection.client as any)['context'].client.constructor.name, 'Client_MySQL2')
      assert.equal((connection.client as any)['context'].client.config.connection.charset, 'utf-8')
      assert.equal((connection.client as any)['context'].client.config.connection.typeCast, false)
      await connection.disconnect()
    })
  })
}

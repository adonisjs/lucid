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
import knex from 'knex'
import { MysqlConfig } from '@ioc:Adonis/Lucid/Database'

import { Connection } from '../../src/Connection'
import {
  fs,
  getConfig,
  setup,
  cleanup,
  resetTables,
  setupReplicaDb,
  cleanupReplicaDb,
  setupApplication,
} from '../../test-helpers'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

let app: ApplicationContract

if (process.env.DB !== 'sqlite') {
  test.group('Connection | config', (group) => {
    group.before(async () => {
      app = await setupApplication()
      await setup()
    })

    group.after(async () => {
      await cleanup()
      await fs.cleanup()
    })

    test('get write config by merging values from connection', (assert) => {
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

      const connection = new Connection('primary', config, app.logger)
      const writeConfig = connection['getWriteConfig']()

      assert.equal(writeConfig.client, config.client)
      assert.equal(writeConfig.connection!['host'], '10.0.0.1')
    })

    test('get read config by merging values from connection', (assert) => {
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

      const connection = new Connection('primary', config, app.logger)
      const readConfig = connection['getReadConfig']()

      assert.equal(readConfig.client, config.client)
    })
  })
}

test.group('Connection | setup', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('do not instantiate knex unless connect is called', (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    assert.isUndefined(connection.client)
  })

  test('instantiate knex when connect is invoked', async (assert, done) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.on('connect', async () => {
      assert.isDefined(connection.client!)
      assert.equal(connection.pool!.numUsed(), 0)
      await connection.disconnect()
      done()
    })

    connection.connect()
  })

  test('on disconnect destroy knex', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()
    await connection.disconnect()

    assert.isUndefined(connection.client)
    assert.isUndefined(connection['_readClient'])
  })

  test('on disconnect emit disconnect event', async (assert, done) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    connection.on('disconnect', () => {
      assert.isUndefined(connection.client)
      done()
    })

    await connection.disconnect()
  })

  test('raise error when unable to make connection', (assert, done) => {
    assert.plan(2)

    const connection = new Connection(
      'primary',
      Object.assign({}, getConfig(), { client: null }),
      app.logger
    )

    connection.on('error', ({ message }) => {
      try {
        assert.equal(message, "knex: Required configuration option 'client' is missing.")
        done()
      } catch (error) {
        done(error)
      }
    })

    const fn = () => connection.connect()
    assert.throw(fn, /knex: Required configuration option/)
  })
})

if (process.env.DB === 'mysql') {
  test.group('Connection | setup mysql', () => {
    test('pass user config to mysql driver', async (assert) => {
      const config = getConfig() as MysqlConfig
      config.connection!.charset = 'utf-8'
      config.connection!.typeCast = false

      const connection = new Connection('primary', config, app.logger)
      connection.connect()

      assert.equal(connection.client!['context'].client.constructor.name, 'Client_MySQL')
      assert.equal(connection.client!['context'].client.config.connection.charset, 'utf-8')
      assert.equal(connection.client!['context'].client.config.connection.typeCast, false)
      await connection.disconnect()
    })
  })
}

if (process.env.DB === 'mysql_legacy') {
  test.group('Connection | round robin', (group) => {
    group.before(async () => {
      app = await setupApplication()
    })

    group.after(async () => {
      await cleanup()
      await fs.cleanup()
    })

    test.only('round robin between read connections when pool is not free', async (assert) => {
      /**
       * Initial setup
       */
      const writeConnection = {
        host: process.env.MYSQL_LEGACY_HOST,
        port: Number(process.env.MYSQL_LEGACY_PORT),
        user: process.env.MYSQL_LEGACY_USER,
        password: process.env.MYSQL_LEGACY_PASSWORD,
        database: 'lucid',
      }

      const readConnection = {
        host: process.env.MYSQL_LEGACY_HOST,
        port: Number(process.env.MYSQL_LEGACY_PORT),
        user: process.env.MYSQL_LEGACY_USER,
        password: process.env.MYSQL_LEGACY_PASSWORD,
        database: 'lucid',
      }

      const replica1 = {
        host: process.env.MYSQL_REPLICA_1_HOST,
        port: Number(process.env.MYSQL_REPLICA_1_PORT),
        user: process.env.MYSQL_REPLICA_1_USER,
        password: process.env.MYSQL_REPLICA_1_PASSWORD,
        database: 'lucid',
      }

      const replica2 = {
        host: process.env.MYSQL_REPLICA_2_HOST,
        port: Number(process.env.MYSQL_REPLICA_2_PORT),
        user: process.env.MYSQL_REPLICA_2_USER,
        password: process.env.MYSQL_REPLICA_2_PASSWORD,
        database: 'lucid',
      }

      const knexConnection = knex({ client: 'mysql', connection: writeConnection })
      await setupReplicaDb(knexConnection, [{ username: 'virk' }])

      const knexReplica1 = knex({ client: 'mysql', connection: replica1 })
      await setupReplicaDb(knexReplica1, [{ username: 'romain' }])

      const knexReplica2 = knex({ client: 'mysql', connection: replica2 })
      await setupReplicaDb(knexReplica2, [{ username: 'nikk' }])

      const config: MysqlConfig = {
        client: 'mysql' as const,
        replicas: {
          write: {
            connection: writeConnection,
          },
          read: {
            pool: {
              min: 0,
              idleTimeoutMillis: 30000,
            },
            connection: [readConnection, replica1, replica2],
          },
        },
        debug: false,
      }

      const connection = new Connection('primary', config, app.logger)
      connection.connect()

      const [a, b, c] = await Promise.all([
        connection.readClient!.from('replica_users').select('*'),
        connection.readClient!.from('replica_users').select('*'),
        connection.readClient!.from('replica_users').select('*'),
      ])

      assert.notEqual(a[0].username, b[0].username)
      assert.notEqual(a[0].username, c[0].username)
      assert.notEqual(b[0].username, c[0].username)

      await cleanupReplicaDb(knexConnection)
      await cleanupReplicaDb(knexReplica1)
      await cleanupReplicaDb(knexReplica2)
    })

    test.only('send requests to the same connection, when pool has connections', async (assert) => {
      /**
       * Initial setup
       */
      const writeConnection = {
        host: process.env.MYSQL_LEGACY_HOST,
        port: Number(process.env.MYSQL_LEGACY_PORT),
        user: process.env.MYSQL_LEGACY_USER,
        password: process.env.MYSQL_LEGACY_PASSWORD,
        database: 'lucid',
      }

      const readConnection = {
        host: process.env.MYSQL_LEGACY_HOST,
        port: Number(process.env.MYSQL_LEGACY_PORT),
        user: process.env.MYSQL_LEGACY_USER,
        password: process.env.MYSQL_LEGACY_PASSWORD,
        database: 'lucid',
      }

      const replica1 = {
        host: process.env.MYSQL_REPLICA_1_HOST,
        port: Number(process.env.MYSQL_REPLICA_1_PORT),
        user: process.env.MYSQL_REPLICA_1_USER,
        password: process.env.MYSQL_REPLICA_1_PASSWORD,
        database: 'lucid',
      }

      const replica2 = {
        host: process.env.MYSQL_REPLICA_2_HOST,
        port: Number(process.env.MYSQL_REPLICA_2_PORT),
        user: process.env.MYSQL_REPLICA_2_USER,
        password: process.env.MYSQL_REPLICA_2_PASSWORD,
        database: 'lucid',
      }

      const knexConnection = knex({ client: 'mysql', connection: writeConnection })
      await setupReplicaDb(knexConnection, [{ username: 'virk' }])

      const knexReplica1 = knex({ client: 'mysql', connection: replica1 })
      await setupReplicaDb(knexReplica1, [{ username: 'romain' }])

      const knexReplica2 = knex({ client: 'mysql', connection: replica2 })
      await setupReplicaDb(knexReplica2, [{ username: 'nikk' }])

      const config: MysqlConfig = {
        client: 'mysql' as const,
        replicas: {
          write: {
            connection: writeConnection,
          },
          read: {
            pool: {
              min: 3,
              idleTimeoutMillis: 30000,
            },
            connection: [readConnection, replica1, replica2],
          },
        },
        debug: false,
      }

      const connection = new Connection('primary', config, app.logger)
      connection.connect()

      const [a, b, c] = await Promise.all([
        connection.readClient!.from('replica_users').select('*'),
        connection.readClient!.from('replica_users').select('*'),
        connection.readClient!.from('replica_users').select('*'),
      ])

      assert.equal(a[0].username, b[0].username)
      assert.equal(a[0].username, c[0].username)
      assert.equal(b[0].username, c[0].username)

      await cleanupReplicaDb(knexConnection)
      await cleanupReplicaDb(knexReplica1)
      await cleanupReplicaDb(knexReplica2)
    })
  })
}

test.group('Health Checks', (group) => {
  group.before(async () => {
    app = await setupApplication()
    await setup()
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
  })

  test('get healthcheck report for healthy connection', async (assert) => {
    const connection = new Connection('primary', getConfig(), app.logger)
    connection.connect()

    const report = await connection.getReport()
    assert.deepEqual(report, {
      connection: 'primary',
      message: 'Connection is healthy',
      error: null,
    })

    await connection.disconnect()
  })

  if (process.env.DB !== 'sqlite') {
    test('get healthcheck report for un-healthy connection', async (assert) => {
      const connection = new Connection(
        'primary',
        Object.assign({}, getConfig(), {
          connection: {
            host: 'bad-host',
          },
        }),
        app.logger
      )
      connection.connect()

      const report = await connection.getReport()
      assert.equal(report.message, 'Unable to reach the database server')
      assert.exists(report.error)

      await connection.disconnect()
    }).timeout(0)

    test('get healthcheck report for un-healthy read host', async (assert) => {
      const connection = new Connection(
        'primary',
        Object.assign({}, getConfig(), {
          replicas: {
            write: {
              connection: getConfig().connection,
            },
            read: {
              connection: [
                getConfig().connection,
                Object.assign({}, getConfig().connection, { host: 'bad-host' }),
              ],
            },
          },
        }),
        app.logger
      )
      connection.connect()

      const report = await connection.getReport()
      assert.equal(report.message, 'Unable to reach one of the read hosts')
      assert.exists(report.error)

      await connection.disconnect()
    }).timeout(0)
  }
})

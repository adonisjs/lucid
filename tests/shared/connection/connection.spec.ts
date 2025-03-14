/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Connection } from '../../../src/connection/connection.js'
import { getConnectionConfig, SUPPORTS_READ_WRITE_REPLICAS } from '../../helpers.js'

test.group('Connection | config', () => {
  test('override top-level connection properties with write replica properties', ({ assert }) => {
    const config = getConnectionConfig() as any
    config.replicas = {
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

    const connection = new Connection('primary', config)
    assert.equal(connection.identifier, connection.name)
    assert.equal(connection.client!.client.config.connection.host, '10.0.0.1')
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)

  test('define write connection as a connection string uri', ({ assert }) => {
    const config = getConnectionConfig() as any
    config.replicas = {
      write: {
        connection: 'postgres://someuser:somepassword@somehost:381/somedatabase',
      },
      read: {
        connection: [
          {
            host: '10.0.0.1',
          },
        ],
      },
    }

    const connection = new Connection('primary', config)
    assert.deepEqual(connection.client!.client.config.connection, {
      user: 'someuser',
      host: 'somehost',
      port: '381',
      database: 'somedatabase',
    })
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)

  test('define read connection as a connection string uri', ({ assert }) => {
    const config = getConnectionConfig() as any
    config.replicas = {
      write: {
        connection: 'postgres://someuser:somepassword@somehost:381/somedatabase',
      },
      read: {
        connection: ['postgres://someuser:somepassword@somehost:381/somedatabase'],
      },
    }

    const connection = new Connection('primary', config)
    assert.deepEqual(connection.readClient!.client.config.connection, {
      database: config.connection.database,
    })
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)

  test('only set connection database for read replicas', ({ assert }) => {
    const config = getConnectionConfig() as any
    config.replicas = {
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

    const connection = new Connection('primary', config)
    /**
     * All other properties are provided via round-robin
     */
    assert.deepEqual(connection.readClient!.client.config.connection, {
      database: config.connection.database,
    })
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)

  test('throw error when connection and replicas both are missing', () => {
    const config = getConnectionConfig() as any
    delete config.connection

    new Connection('primary', config)
  }).throws('Make sure to define read/write "replicas" or define the "connection" options')

  test('throw error when replicas are missing read or write properties', () => {
    const config = getConnectionConfig() as any
    config.replicas = {
      write: {
        connection: {
          host: '10.0.0.1',
        },
      },
    }

    new Connection('primary', config)
  }).throws('Make sure to define connection property inside read/write replicas')

  test('throw error when replicas read-write replicas are missing connection property', () => {
    const config = getConnectionConfig() as any
    config.replicas = {
      write: {},
      read: {},
    }

    new Connection('primary', config)
  }).throws('Make sure to define connection property inside read/write replicas')
})

test.group('Connection | setup', () => {
  test('instantiate knex when connection is constructed', async ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.strictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)
    assert.isTrue(connection.ready)
  })

  test('cleanup knex references on close', async ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())

    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.strictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)

    await connection.close()
    assert.isFalse(connection.ready)
    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)

    assert.throws(() => connection.getReadClient(), 'Cannot access connection client.')
    assert.throws(() => connection.getWriteClient(), 'Cannot access connection client.')
  })

  test('invoke on close hook', async ({ assert }) => {
    let onCloseInvoked = false
    const connection = new Connection('primary', getConnectionConfig())

    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.strictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)

    connection.onClose(() => {
      onCloseInvoked = true
    })

    await connection.close()
    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)
    assert.isTrue(onCloseInvoked)
  })

  test('make connection with read-write replicas', async ({ assert }) => {
    const connectionConfig = getConnectionConfig()
    const connection = new Connection('primary', {
      ...connectionConfig,
      replicas: {
        write: {
          connection: connectionConfig.connection,
        },
        read: {
          connection: [connectionConfig.connection],
        },
      },
    })

    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.notStrictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)
    assert.isTrue(connection.ready)

    await connection.close()
    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)
})

test.group('Connection | query', () => {
  test('run query', async ({ assert, cleanup }) => {
    const connectionConfig = getConnectionConfig()
    const connection = new Connection('primary', {
      ...connectionConfig,
    })

    cleanup(() => connection.close())

    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.strictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)
    assert.isTrue(connection.ready)

    await connection.client!.raw('SELECT 1 + 1 AS result')
    await connection.readClient!.raw('SELECT 1 + 1 AS result')
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)

  test('run query using read-write replicas', async ({ assert, cleanup }) => {
    const connectionConfig = getConnectionConfig()
    const connection = new Connection('primary', {
      ...connectionConfig,
      replicas: {
        write: {
          connection: connectionConfig.connection,
        },
        read: {
          connection: [connectionConfig.connection],
        },
      },
    })

    cleanup(() => connection.close())

    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.notStrictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)
    assert.isTrue(connection.ready)

    await connection.client!.raw('SELECT 1 + 1 AS result')
    await connection.readClient!.raw('SELECT 1 + 1 AS result')
  }).skip(!SUPPORTS_READ_WRITE_REPLICAS)
})

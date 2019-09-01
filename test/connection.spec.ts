/*
* @adonisjs/lucid
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

/// <reference path="../adonis-typings/database.ts" />

import test from 'japa'
import { MysqlConfigContract } from '@ioc:Adonis/Lucid/Database'

import { Connection } from '../src/Connection'
import { getConfig, setup, cleanup, resetTables, getLogger } from '../test-helpers'

if (process.env.DB !== 'sqlite') {
  test.group('Connection | config', (group) => {
    group.before(async () => {
      await setup()
    })

    group.after(async () => {
      await cleanup()
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
          connection: [{
            host: '10.0.0.1',
          }],
        },
      }

      const connection = new Connection('primary', config, getLogger())
      const writeConfig = connection['_getWriteConfig']()

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
          connection: [{
            host: '10.0.0.1',
          }],
        },
      }

      const connection = new Connection('primary', config, getLogger())
      const readConfig = connection['_getReadConfig']()

      assert.equal(readConfig.client, config.client)
      assert.deepEqual(readConfig.connection, { database: 'lucid' })
    })
  })
}

test.group('Connection | setup', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  group.afterEach(async () => {
    await resetTables()
  })

  test('do not instantiate knex unless connect is called', (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    assert.isUndefined(connection.client)
  })

  test('instantiate knex when connect is invoked', async (assert, done) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.on('connect', () => {
      assert.isDefined(connection.client!)
      assert.equal(connection.pool!.numUsed(), 0)
      done()
    })

    connection.connect()
  })

  test('on disconnect destroy knex', async (assert) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()
    await connection.disconnect()

    assert.isUndefined(connection.client)
    assert.isUndefined(connection['_readClient'])
  })

  test('on disconnect emit disconnect event', async (assert, done) => {
    const connection = new Connection('primary', getConfig(), getLogger())
    connection.connect()

    connection.on('disconnect', () => {
      assert.isUndefined(connection.client)
      done()
    })

    await connection.disconnect()
  })

  test('raise error when unable to make connection', (assert) => {
    const connection = new Connection(
      'primary',
      Object.assign({}, getConfig(), { client: null }),
      getLogger(),
    )

    const fn = () => connection.connect()
    assert.throw(fn, /knex: Required configuration option/)
  })
})

if (process.env.DB === 'mysql') {
  test.group('Connection | setup mysql', () => {
    test('pass user config to mysql driver', async (assert) => {
      const config = getConfig() as MysqlConfigContract
      config.connection!.charset = 'utf-8'
      config.connection!.typeCast = false

      const connection = new Connection('primary', config, getLogger())
      connection.connect()

      assert.equal(connection.client!['_context'].client.constructor.name, 'Client_MySQL')
      assert.equal(connection.client!['_context'].client.config.connection.charset, 'utf-8')
      assert.equal(connection.client!['_context'].client.config.connection.typeCast, false)
    })
  })
}

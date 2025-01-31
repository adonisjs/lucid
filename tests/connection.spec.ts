/*
 * @adonisjs/lucid
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Connection } from '../src/connection.js'
import { getConnectionConfig } from './helpers.js'

if (!['sqlite', 'libsql'].includes(process.env.DB!)) {
  test.group('Connection | config', () => {
    test('get write config by merging values from connection', ({ assert }) => {
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
      console.log(connection.client)
    })
  })
}

test.group('Connection | setup', () => {
  test('instantiate knex when connection is constructed', async ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())
    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.strictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)
  })

  test('cleanup knex references on close', async ({ assert }) => {
    const connection = new Connection('primary', getConnectionConfig())

    assert.isDefined(connection.client)
    assert.isDefined(connection.readClient)
    assert.strictEqual(connection.client, connection.readClient)
    assert.strictEqual(connection.pool!.numUsed(), 0)
    assert.strictEqual(connection.readPool!.numUsed(), 0)

    await connection.close()
    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)
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
})

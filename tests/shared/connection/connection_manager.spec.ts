/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { getConnectionConfig } from '../../helpers.js'
import { Connection } from '../../../src/connection/connection.js'
import { ConnectionManager } from '../../../src/connection/manager.js'

test.group('Connection Manager', () => {
  test('add connection to the manager', ({ assert }) => {
    const manager = new ConnectionManager()
    const config = getConnectionConfig()
    manager.add('primary', config)

    assert.isTrue(manager.has('primary'))
    assert.isFalse(manager.isConnected('primary'))
    assert.containsSubset(manager.get('primary'), {
      identifier: 'primary',
      name: 'primary',
      state: 'registered',
    })
    assert.strictEqual(manager.get('primary')?.config, config)
  })

  test('noop when connection already exists', ({ assert }) => {
    const manager = new ConnectionManager()
    const config = getConnectionConfig()

    manager.add('primary', config)
    manager.add('primary', { ...config, pool: { min: 0, max: 1 } })

    assert.strictEqual(manager.get('primary')?.config, config)
  })

  test('make connection', ({ assert }) => {
    const manager = new ConnectionManager()
    manager.add('primary', getConnectionConfig())
    manager.connect('primary')

    assert.isTrue(manager.has('primary'))
    assert.isTrue(manager.isConnected('primary'))
    assert.instanceOf(manager.get('primary')!.connection, Connection)
    assert.equal(manager.get('primary')!.state, 'open')
  })

  test('throw error when trying to connect to an untracked connection', () => {
    const manager = new ConnectionManager()
    manager.connect('primary')
  }).throws('Cannot connect to an unregistered connection "primary"')

  test('multiple calls to connect should be a noop', ({ assert }) => {
    const events: {
      name: string | Symbol
      payload: Connection
    }[] = []

    const manager = new ConnectionManager(undefined, {
      emit(name, payload) {
        events.push({ name, payload })
      },
      hasListeners() {
        return true
      },
    })

    manager.add('primary', getConnectionConfig())
    manager.connect('primary')
    manager.connect('primary')
    manager.connect('primary')
    manager.connect('primary')

    assert.lengthOf(events, 1)
    assert.equal(events[0].name, 'db:connection:connect')
  })

  test('close and re-connect to the connection', async ({ assert }) => {
    const manager = new ConnectionManager()
    manager.add('primary', getConnectionConfig())

    /**
     * Make connection
     */
    manager.connect('primary')

    assert.isTrue(manager.isConnected('primary'))
    assert.instanceOf(manager.get('primary')!.connection, Connection)
    assert.equal(manager.get('primary')!.state, 'open')

    /**
     * Disconnect using the connection directly
     */
    const connection = manager.get('primary')!.connection!
    await connection.close()

    assert.isFalse(manager.isConnected('primary'))
    assert.isUndefined(manager.get('primary')!.connection)
    assert.equal(manager.get('primary')!.state, 'closed')

    /**
     * Reconnect using the connection directly
     */
    manager.connect('primary')
    assert.isTrue(manager.isConnected('primary'))
    assert.instanceOf(manager.get('primary')!.connection, Connection)
    assert.equal(manager.get('primary')!.state, 'open')

    /**
     * Ensure both connections are separate instances after
     * re-connect
     */
    const connection1 = manager.get('primary')!.connection!
    assert.notStrictEqual(connection, connection1)
  })

  test('close and release the connection', async ({ assert }) => {
    const manager = new ConnectionManager()
    manager.add('primary', getConnectionConfig())

    /**
     * Make connection
     */
    manager.connect('primary')

    assert.isTrue(manager.isConnected('primary'))
    assert.instanceOf(manager.get('primary')!.connection, Connection)
    assert.equal(manager.get('primary')!.state, 'open')

    const connection = manager.get('primary')!.connection!
    await manager.release('primary')

    assert.isUndefined(connection.client)
    assert.isUndefined(connection.readClient)

    assert.isFalse(manager.has('primary'))
  })

  test('emit events around connection and disconnection', async ({ assert }) => {
    const events: {
      name: string | Symbol
      payload: Connection | [error: any, connection: Connection]
    }[] = []
    const manager = new ConnectionManager(undefined, {
      emit(name, payload) {
        events.push({ name, payload })
      },
      hasListeners() {
        return true
      },
    })
    manager.add('primary', getConnectionConfig())

    /**
     * Make connection
     */
    manager.connect('primary')

    assert.isTrue(manager.isConnected('primary'))
    assert.instanceOf(manager.get('primary')!.connection, Connection)
    assert.equal(manager.get('primary')!.state, 'open')

    await manager.release('primary')
    assert.lengthOf(events, 2)
    assert.equal(events[0].name, 'db:connection:connect')
    assert.instanceOf(events[0].payload, Connection)

    assert.equal(events[1].name, 'db:connection:disconnect')
    assert.instanceOf((events[1].payload as any)[1], Connection)
  })
})

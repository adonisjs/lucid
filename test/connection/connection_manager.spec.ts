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
import { ConnectionManager } from '../../src/connection/manager.js'
import {
  setup,
  getConfig,
  cleanup,
  mapToObj,
  logger,
  createEmitter,
} from '../../test-helpers/index.js'

test.group('ConnectionManager', (group) => {
  group.setup(async () => {
    await setup()
  })

  group.teardown(async () => {
    await cleanup()
  })

  test('do not connect until connect is called', async ({ assert }) => {
    const manager = new ConnectionManager(logger, createEmitter())
    manager.add('primary', getConfig())

    assert.isTrue(manager.has('primary'))
    assert.isFalse(manager.isConnected('primary'))
    await manager.closeAll()
  })

  test('connect and set its state to open', async ({ assert }) => {
    const manager = new ConnectionManager(logger, createEmitter())
    manager.add('primary', getConfig())
    manager.connect('primary')

    assert.equal(manager.get('primary')!.state, 'open')
    assert.isTrue(manager.isConnected('primary'))
    await manager.closeAll()
  })

  test('on disconnect set state to closed', async ({ assert }) => {
    const manager = new ConnectionManager(logger, createEmitter())
    manager.add('primary', getConfig())
    manager.connect('primary')

    await manager.connections.get('primary')!.connection!.disconnect()
    assert.equal(manager.get('primary')!.state, 'closed')
    assert.isFalse(manager.isConnected('primary'))
    await manager.closeAll()
  })

  test('add duplicate connection must be a noop', async ({ assert }) => {
    const manager = new ConnectionManager(logger, createEmitter())
    manager.add('primary', getConfig())
    manager.connect('primary')

    manager.add('primary', Object.assign({}, getConfig(), { client: 'foo' }))
    assert.notEqual(manager.get('primary')!.config.client, 'foo')
    await manager.closeAll()
  })

  test('patch config when connection is not in open state', async ({ assert }) => {
    const manager = new ConnectionManager(logger, createEmitter())
    manager.add('primary', getConfig())
    manager.connect('primary')

    await manager.close('primary')

    const fn = () => manager.add('primary', getConfig())
    assert.doesNotThrows(fn)
    await manager.closeAll()
  })

  test('ignore multiple calls to `connect` on a single connection', async (_, done) => {
    let counter = 0

    const emitter = createEmitter()
    const manager = new ConnectionManager(logger, emitter)
    manager.add('primary', getConfig())

    emitter.on('db:connection:connect', () => {
      counter++
      if (counter > 1) {
        throw new Error('Never expected to be called')
      }
      done()
    })

    manager.connect('primary')
    manager.connect('primary')
    await manager.closeAll()
  }).waitForDone()

  test('releasing a connection must close it first', async ({ assert }) => {
    assert.plan(2)

    const emitter = createEmitter()
    const manager = new ConnectionManager(logger, emitter)
    manager.add('primary', getConfig())
    manager.connect('primary')

    emitter.on('db:connection:disconnect', (connection) => {
      assert.equal(connection.name, 'primary')
    })

    await manager.release('primary')
    assert.isFalse(manager.has('primary'))
  })

  test('patching the connection config must close old and create a new connection', async ({
    assert,
  }, done) => {
    assert.plan(6)

    let connections: any[] = []

    const emitter = createEmitter()
    const manager = new ConnectionManager(logger, emitter)
    manager.add('primary', getConfig())

    emitter.on('db:connection:disconnect', async (connection) => {
      try {
        assert.deepEqual(connection, connections[0])
        assert.equal(manager['orphanConnections'].size, 0)
        assert.deepEqual(mapToObj(manager.connections), {
          primary: {
            config: connections[1].config,
            name: 'primary',
            state: 'open',
            connection: connections[1],
          },
        })
        done()
      } catch (error) {
        done(error)
      }
    })

    emitter.on('db:connection:connect', (connection) => {
      assert.instanceOf(connection, Connection)
      if (connections.length) {
        assert.notDeepEqual(connections[0], connection)
      }

      connections.push(connection)
    })

    manager.connect('primary')

    /**
     * Patching will trigger disconnect and a new connect
     */
    manager.patch('primary', getConfig())
    manager.connect('primary')
  }).waitForDone()
})

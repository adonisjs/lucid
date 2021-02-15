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
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { Connection } from '../../src/Connection'
import { ConnectionManager } from '../../src/Connection/Manager'
import { fs, getConfig, setup, cleanup, mapToObj, setupApplication } from '../../test-helpers'

let app: ApplicationContract

test.group('ConnectionManager', (group) => {
  group.before(async () => {
    await setup()
  })

  group.beforeEach(async () => {
    app = await setupApplication()
  })

  group.after(async () => {
    await cleanup()
    await fs.cleanup()
  })

  test('do not connect until connect is called', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', getConfig())

    assert.isTrue(manager.has('primary'))
    assert.isFalse(manager.isConnected('primary'))
    await manager.closeAll()
  })

  test('connect and set its state to open', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', getConfig())
    manager.connect('primary')

    assert.equal(manager.get('primary')!.state, 'open')
    assert.isTrue(manager.isConnected('primary'))
    await manager.closeAll()
  })

  test('on disconnect set state to closed', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', getConfig())
    manager.connect('primary')

    await manager.connections.get('primary')!.connection!.disconnect()
    assert.equal(manager.get('primary')!.state, 'closed')
    assert.isFalse(manager.isConnected('primary'))
    await manager.closeAll()
  })

  test('add duplicate connection must be a noop', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', getConfig())
    manager.connect('primary')

    manager.add('primary', Object.assign({}, getConfig(), { client: 'foo' }))
    assert.notEqual(manager.get('primary')!.config.client, 'foo')
    await manager.closeAll()
  })

  test('patch config when connection is not in open state', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', getConfig())
    manager.connect('primary')

    await manager.close('primary')

    const fn = () => manager.add('primary', getConfig())
    assert.doesNotThrow(fn)
    await manager.closeAll()
  })

  test('ignore multiple calls to `connect` on a single connection', async (_, done) => {
    const emitter = app.container.use('Adonis/Core/Event')
    let counter = 0

    const manager = new ConnectionManager(app.logger, emitter)
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
  })

  test('releasing a connection must close it first', async (assert) => {
    assert.plan(2)

    const emitter = app.container.use('Adonis/Core/Event')

    const manager = new ConnectionManager(app.logger, emitter)
    manager.add('primary', getConfig())
    manager.connect('primary')

    emitter.on('db:connection:disconnect', (connection) => {
      assert.equal(connection.name, 'primary')
    })

    await manager.release('primary')
    assert.isFalse(manager.has('primary'))
  })

  test('proxy error event', async (assert, done) => {
    assert.plan(3)

    const emitter = app.container.use('Adonis/Core/Event')
    const manager = new ConnectionManager(app.logger, emitter)
    manager.add('primary', Object.assign({}, getConfig(), { client: null }))

    emitter.on('db:connection:error', async ([{ message }, connection]) => {
      try {
        assert.equal(message, "knex: Required configuration option 'client' is missing.")
        assert.instanceOf(connection, Connection)
        await manager.closeAll()
        done()
      } catch (error) {
        await manager.closeAll()
        done(error)
      }
    })

    const fn = () => manager.connect('primary')
    assert.throw(fn, /knex: Required configuration option/)
  })

  test('patching the connection config must close old and create a new connection', async (assert, done) => {
    assert.plan(6)

    let connections: any[] = []

    const emitter = app.container.use('Adonis/Core/Event')
    const manager = new ConnectionManager(app.logger, emitter)
    manager.add('primary', getConfig())

    emitter.on('db:connection:disconnect', async (connection) => {
      try {
        assert.deepEqual(connection, connections[0])
        assert.equal(manager['orphanConnections'].size, 0)
        assert.deepEqual(mapToObj(manager.connections), {
          primary: {
            config: connection.config,
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
  })

  test('get health check report for connections that has enabled health checks', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', Object.assign({}, getConfig(), { healthCheck: true }))
    manager.add('secondary', Object.assign({}, getConfig(), { healthCheck: true }))
    manager.add('secondary-copy', Object.assign({}, getConfig(), { healthCheck: false }))

    const report = await manager.report()
    assert.equal(report.health.healthy, true)
    assert.equal(report.health.message, 'All connections are healthy')
    assert.lengthOf(report.meta, 2)
    assert.deepEqual(
      report.meta.map(({ connection }) => connection),
      ['primary', 'secondary']
    )
  })

  test('get health check report when one of the connection is unhealthy', async (assert) => {
    const manager = new ConnectionManager(app.logger, app.container.use('Adonis/Core/Event'))
    manager.add('primary', Object.assign({}, getConfig(), { healthCheck: true }))
    manager.add(
      'secondary',
      Object.assign({}, getConfig(), {
        healthCheck: true,
        connection: { host: 'bad-host' },
      })
    )
    manager.add('secondary-copy', Object.assign({}, getConfig(), { healthCheck: false }))

    const report = await manager.report()
    assert.equal(report.health.healthy, false)
    assert.equal(report.health.message, 'One or more connections are not healthy')
    assert.lengthOf(report.meta, 2)
    assert.deepEqual(
      report.meta.map(({ connection }) => connection),
      ['primary', 'secondary']
    )
  }).timeout(0)
})

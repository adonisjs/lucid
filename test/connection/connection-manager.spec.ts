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

import { Connection } from '../../src/Connection'
import { ConnectionManager } from '../../src/Connection/Manager'
import { getConfig, setup, cleanup, getLogger } from '../../test-helpers'

test.group('ConnectionManager', (group) => {
  group.before(async () => {
    await setup()
  })

  group.after(async () => {
    await cleanup()
  })

  test('do not connect until connect is called', (assert) => {
    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())

    assert.isTrue(manager.has('primary'))
    assert.isFalse(manager.isConnected('primary'))
  })

  test('connect and set its state to open', async (assert) => {
    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())
    manager.connect('primary')

    assert.equal(manager.get('primary')!.state, 'open')
    assert.isTrue(manager.isConnected('primary'))
  })

  test('on disconnect set state to closed', async (assert) => {
    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())
    manager.connect('primary')

    await manager.connections.get('primary')!.connection!.disconnect()
    assert.equal(manager.get('primary')!.state, 'closed')
    assert.isFalse(manager.isConnected('primary'))
  })

  test('raise exception when attempt to add a duplication connection', async (assert) => {
    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())
    manager.connect('primary')

    const fn = () => manager.add('primary', getConfig())
    assert.throw(fn, 'E_DUPLICATE_DB_CONNECTION: Attempt to add duplicate connection primary failed')
  })

  test('patch config when connection is not in open state', async (assert) => {
    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())
    manager.connect('primary')

    await manager.close('primary')

    const fn = () => manager.add('primary', getConfig())
    assert.doesNotThrow(fn)
  })

  test('ignore multiple calls to `connect` on a single connection', async () => {
    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())
    manager.connect('primary')

    manager.on('connect', () => {
      throw new Error('Never expected to be called')
    })

    manager.connect('primary')
  })

  test('releasing a connection must close it first', async (assert) => {
    assert.plan(2)

    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())
    manager.connect('primary')

    manager.on('disconnect', (connection) => {
      assert.equal(connection.name, 'primary')
    })

    await manager.release('primary')
    assert.isFalse(manager.has('primary'))
  })

  test('proxy connect event', (assert, done) => {
    assert.plan(1)

    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())

    manager.on('connect', (connection) => {
      assert.instanceOf(connection, Connection)
      done()
    })

    manager.connect('primary')
  })

  test('proxy disconnect event', async (assert, done) => {
    assert.plan(1)

    const manager = new ConnectionManager(getLogger())
    manager.add('primary', getConfig())

    manager.on('disconnect', (connection) => {
      assert.instanceOf(connection, Connection)
      done()
    })

    manager.connect('primary')
    await manager.close('primary')
  })

  test('proxy error event', async (assert, done) => {
    assert.plan(3)

    const manager = new ConnectionManager(getLogger())
    manager.add('primary', Object.assign({}, getConfig(), { client: null }))

    manager.on('error', ({ message }, connection) => {
      try {
        assert.equal(message, 'knex: Required configuration option \'client\' is missing.')
        assert.instanceOf(connection, Connection)
        done()
      } catch (error) {
        done(error)
      }
    })

    const fn = () => manager.connect('primary')
    assert.throw(fn, /knex: Required configuration option/)
  })
})

/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { dbSetup, getConnectionConfig } from '../../helpers.js'
import { Connection } from '../../../src/connection/connection.js'
import { QueryClient } from '../../../src/database_clients/query_client.js'

test.group('SQLite Dialect | update', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('update table with complex values', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertInto('users')
      .values([
        {
          first_name: 'Harminder',
          last_name: 'Virk',
          email: 'virk@adonisjs.com',
          age: 35,
        },
        {
          first_name: 'Romain',
          last_name: 'Lanz',
          username: 'rlanz',
          email: 'rlanz@adonisjs.com',
          age: 30,
        },
      ])
      .exec()

    await client
      .updateTable('users')
      .set({
        username: client.raw('CASE WHEN ?? iS NULL THEN ?? ELSE ?? END', [
          'username',
          'email',
          'username',
        ]),
        age: client.raw('?? + ?', ['age', 1]),
      })
      .exec()

    const users = await client.query().select('email', 'username', 'age').from('users').exec()
    assert.deepEqual(users, [
      {
        age: 36,
        email: 'virk@adonisjs.com',
        username: 'virk@adonisjs.com',
      },
      {
        age: 31,
        email: 'rlanz@adonisjs.com',
        username: 'rlanz',
      },
    ])
  })

  test('update table as a key-value pair', async ({ assert, cleanup }) => {
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbSetup(connection)

    await client
      .insertInto('users')
      .values([
        {
          first_name: 'Romain',
          last_name: 'Lanz',
          username: 'rlanz',
          email: 'rlanz@adonisjs.com',
          age: 30,
        },
      ])
      .exec()

    await client
      .updateTable('users')
      .set('username', client.raw('??', ['email']))
      .where('username', 'rlanz')
      .exec()

    const users = await client.query().select('email', 'username').from('users').exec()
    assert.deepEqual(users, [
      {
        email: 'rlanz@adonisjs.com',
        username: 'rlanz@adonisjs.com',
      },
    ])
  })
})

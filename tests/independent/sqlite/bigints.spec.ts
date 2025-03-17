/*
 * @adonisjs/lucid
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../../../src/debug.js'
import { Connection } from '../../../src/connection/connection.js'
import { dbBigIntsSetup, getConnectionConfig } from '../../helpers.js'
import { QueryClient } from '../../../src/database_clients/query_client.js'

test.group('SQLite Dialect | bigInt', (group) => {
  group.each.setup(async (t) => {
    await t.context.fs.mkdir('./')
  })

  test('insert and return bigInt values as numbers', async ({ assert, cleanup }) => {
    /**
     * Not supported by us right now, even though SQLite and better-sqlite3
     * both support it. But for that we will have to patch the "acquireConnection"
     * method in Knex.
     *
     * https://github.com/WiseLibs/better-sqlite3/blob/master/docs/integer.md
     * https://github.com/knex/knex/issues/5050
     */
    const config = getConnectionConfig('sqlite')
    const connection = new Connection('primary', config)
    const client = new QueryClient(connection, 'dual')
    cleanup(() => connection.close())

    await dbBigIntsSetup(connection)

    const ids = await client
      .insertQuery()
      .table('departments')
      .values([
        {
          name: 'IT',
          budget: BigInt(100),
        },
        {
          name: 'Sales',
          budget: BigInt(400),
        },
      ])
      .returning(['id'])
      .on('query', (sql) => debug('%O', sql))
      .exec()

    assert.deepEqual(ids, [{ id: 1 }, { id: 2 }])
    const departments = await client.selectFrom('departments').exec()

    assert.deepEqual(departments, [
      {
        id: 1,
        name: 'IT',
        budget: 100,
      },
      {
        id: 2,
        name: 'Sales',
        budget: 400,
      },
    ])
  })
})

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

test.group('PG Dialect | bigInt', () => {
  test('insert and return bigInt id value as a number', async ({ assert, cleanup }) => {
    /**
     * BigInts are supported via the pg.types object for Int8 data-type.
     */
    const config = getConnectionConfig('pg')
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

    assert.deepEqual(ids, [{ id: BigInt(1) }, { id: BigInt(2) }])
    const departments = await client.selectFrom('departments').exec()

    assert.deepEqual(departments, [
      {
        id: BigInt(1),
        name: 'IT',
        budget: BigInt(100),
      },
      {
        id: BigInt(2),
        name: 'Sales',
        budget: BigInt(400),
      },
    ])
  })

  test('return aggregates as bigInt', async ({ assert, cleanup }) => {
    /**
     * BigInts are supported via the pg.types object for Int8 data-type.
     */
    const config = getConnectionConfig('pg')
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

    assert.deepEqual(ids, [{ id: BigInt(1) }, { id: BigInt(2) }])
    const query = client.selectFrom('departments')
    query.knexQuery.count('* as total')

    const departments = await query.exec()
    console.log(departments)
  })
})
